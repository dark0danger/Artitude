import os
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from src.config import config
from src.ingestion.loader import load_documents
from src.ingestion.chunker import chunk_documents
from src.ingestion.manifest import load_manifest, save_manifest, is_file_modified, update_manifest
from src.retrieval.chroma_store import ChromaStore, DB_DIR

def build_index(source_dir: str, project_id: str):
    print(f"Starting ingestion from {source_dir} into collection {project_id}...")
    
    # project-specific manifest path
    manifest_path = os.path.join(source_dir, "..", "manifest.json")
    
    # wipe the collection first to avoid dimension mismatch issues
    print(f"Wiping existing collection '{project_id}' if it exists...")
    try:
        client = ChromaStore.get_client()
        client.delete_collection(name=project_id)
        print("Collection wiped.")
    except Exception:
        print("No existing collection found to wipe.")

    # start fresh -- force re-ingestion every time
    manifest = {}
    files_to_process = []
    for root, _, files in os.walk(source_dir):
        for file in files:
            if file.endswith(('.pdf', '.md', '.txt')):
                file_path = os.path.join(root, file)
                if is_file_modified(file_path, manifest):
                    files_to_process.append(file_path)
                else:
                    print(f"Skipping unmodified file: {file_path}")
    
    if not files_to_process:
        print("No new or modified files to process.")
        return
        
    print(f"Found {len(files_to_process)} files to process.")
    
    documents = []
    from langchain_community.document_loaders import PyPDFLoader, TextLoader
    for file_path in files_to_process:
        ext = os.path.splitext(file_path)[1].lower()
        try:
            if ext == '.pdf':
                loader = PyPDFLoader(file_path)
                docs = loader.load()
                for i, doc in enumerate(docs):
                    doc.metadata['source_file'] = file_path
                    doc.metadata['document_type'] = 'pdf'
                    doc.metadata['page_number'] = doc.metadata.get('page', i + 1)
                documents.extend(docs)
            elif ext in ['.md', '.txt']:
                loader = TextLoader(file_path)
                docs = loader.load()
                for doc in docs:
                    doc.metadata['source_file'] = file_path
                    doc.metadata['document_type'] = 'markdown' if ext == '.md' else 'text'
                    doc.metadata['page_number'] = 1
                documents.extend(docs)
            
            # mark as processed
            update_manifest(file_path, manifest)
        except Exception as e:
            print(f"Failed to process {file_path}: {e}")

    if not documents:
        print("No content extracted from files.")
        return
        
    print(f"Extracted {len(documents)} pages/documents.")
    
    chunks = chunk_documents(documents)
    print(f"Created {len(chunks)} chunks.")
    
    embeddings = OpenAIEmbeddings(
        model=config.EMBEDDING_MODEL_NAME,
        openai_api_key=config.GITHUB_TOKEN,
        openai_api_base="https://models.github.ai/inference"
    )
    
    # make sure the collection exists
    client = ChromaStore.get_client()
    
    vectorstore = Chroma(
        client=client,
        collection_name=project_id,
        embedding_function=embeddings,
    )
    
    print("Adding chunks to Chroma DB...")
    vectorstore.add_documents(chunks)
    
    save_manifest(manifest, manifest_path)
    print("Ingestion complete. Manifest updated.")

if __name__ == "__main__":
    build_index("data/brand_guidelines", "brand_guidelines")
