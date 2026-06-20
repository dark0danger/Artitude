import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_core.documents import Document

def load_documents(source_dir: str) -> list[Document]:
    documents = []
    
    for root, _, files in os.walk(source_dir):
        for file in files:
            file_path = os.path.join(root, file)
            ext = os.path.splitext(file)[1].lower()
            
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
                else:
                    # not a supported format, skip
                    continue
            except Exception as e:
                print(f"Failed to load {file_path}: {e}")
                
    return documents
