import uuid
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

def chunk_documents(documents: list[Document]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", " ", ""]
    )
    
    chunks = splitter.split_documents(documents)
    
    # tag each chunk with useful metadata
    for i, chunk in enumerate(chunks):
        source = chunk.metadata.get('source_file', 'unknown')
        page = chunk.metadata.get('page_number', 1)
        
        chunk.metadata['chunk_id'] = str(uuid.uuid4())
        
        # fill in any missing fields
        if 'source_file' not in chunk.metadata:
            chunk.metadata['source_file'] = source
        if 'document_type' not in chunk.metadata:
            chunk.metadata['document_type'] = 'unknown'
        if 'section_title' not in chunk.metadata:
            chunk.metadata['section_title'] = 'unknown'
        if 'page_number' not in chunk.metadata:
            chunk.metadata['page_number'] = page
            
    return chunks
