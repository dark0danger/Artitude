import argparse
import os
import sys
from src.config import config

def ingest(args):
    print(f"Ingesting source: {args.source}")
    from src.ingestion.build_index import build_index
    project_id = os.path.basename(os.path.normpath(args.source))
    build_index(args.source, project_id)

def query(args):
    print(f"Querying text: {args.text}")
    print("Not implemented yet.")

def analyze(args):
    print(f"Analyzing image: {args.image}")
    from src.vision.analyzer import analyze_asset
    result = analyze_asset(args.image)
    print(result.model_dump_json(indent=2))

def run(args):
    print(f"Running pipeline with query: '{args.query}' and image: '{args.image}'")
    from src.agents.graph import graph
    
    state = {
        "query": args.query,
        "image_path": args.image,
        "recursion_count": 0
    }
    
    # langgraph handles recursion limits in the config
    final_state = graph.invoke(state, config={"recursion_limit": 50})
    
    print("\n--- Final Report ---")
    print(final_state.get("raw_synthesis"))

def export(args):
    print(f"Exporting request ID: {args.request_id} to format: {args.format}")
    print("Not implemented yet.")

def validate(args):
    print(f"Validating against golden set: {args.golden_set}")
    print("Not implemented yet.")

def serve(args):
    import uvicorn
    print("Starting FastAPI server...")
    uvicorn.run("src.api.app:app", host="127.0.0.1", port=8000, reload=True)

def main():
    parser = argparse.ArgumentParser(description="Artitude CLI - brand intelligence & design review tool")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Ingest command
    parser_ingest = subparsers.add_parser("ingest", help="Ingest a brand corpus")
    parser_ingest.add_argument("--source", required=True, help="Path to the source data directory")
    parser_ingest.set_defaults(func=ingest)

    # Query command
    parser_query = subparsers.add_parser("query", help="Answer a text query using the brand corpus")
    parser_query.add_argument("--text", required=True, help="Text query to run")
    parser_query.set_defaults(func=query)

    # Analyze command
    parser_analyze = subparsers.add_parser("analyze", help="Analyze an image (competitor asset)")
    parser_analyze.add_argument("--image", required=True, help="Path to the image to analyze")
    parser_analyze.set_defaults(func=analyze)

    # Run command
    parser_run = subparsers.add_parser("run", help="Run a multimodal pipeline query")
    parser_run.add_argument("--query", required=True, help="Text query")
    parser_run.add_argument("--image", required=True, help="Path to the image")
    parser_run.set_defaults(func=run)

    # Export command
    parser_export = subparsers.add_parser("export", help="Export a report")
    parser_export.add_argument("--request-id", required=True, help="ID of the request to export")
    parser_export.add_argument("--format", required=True, choices=["pdf", "json"], help="Export format")
    parser_export.set_defaults(func=export)

    # Validate command
    parser_validate = subparsers.add_parser("validate", help="Validate system metrics against golden set")
    parser_validate.add_argument("--golden-set", required=True, help="Path to golden set CSV")
    parser_validate.set_defaults(func=validate)
    
    # Serve command
    parser_serve = subparsers.add_parser("serve", help="Start the FastAPI server")
    parser_serve.set_defaults(func=serve)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
