import os
import sys
from pathlib import Path

def list_all_files(directory_path):
    """
    Recursively list all files in a directory and its subdirectories,
    excluding 'node_modules' folder.
    
    Args:
        directory_path (str): Path to the directory to scan
    """
    try:
        # Convert to Path object for easier handling
        dir_path = Path(directory_path)
        
        # Check if directory exists
        if not dir_path.exists():
            print(f"Error: Directory '{directory_path}' does not exist.")
            return
        
        if not dir_path.is_dir():
            print(f"Error: '{directory_path}' is not a directory.")
            return
        
        print(f"Listing all files in: {dir_path.absolute()}")
        print("-" * 50)
        
        file_count = 0
        
        # Method 1: Using os.walk()
        print("Using os.walk():")
        for root, dirs, files in os.walk(directory_path):
            # Exclude 'node_modules' by modifying dirs in-place
            if "node_modules" in dirs:
                dirs.remove("node_modules")
            
            for file in files:
                file_path = os.path.join(root, file)
                print(file_path)
                file_count += 1
        
        print(f"\nTotal files found: {file_count}")
        print("-" * 50)
        
        # Method 2: Using pathlib
        print("\nUsing pathlib (alternative method):")
        file_count_pathlib = 0
        for file_path in dir_path.rglob("*"):
            if file_path.is_file() and "node_modules" not in file_path.parts:
                print(file_path)
                file_count_pathlib += 1
        
        print(f"\nTotal files found (pathlib): {file_count_pathlib}")
        
    except PermissionError:
        print(f"Error: Permission denied accessing '{directory_path}'")
    except Exception as e:
        print(f"Error: {str(e)}")

def main():
    """Main function to handle command line arguments or prompt for directory."""
    
    # Check if directory path is provided as command line argument
    if len(sys.argv) > 1:
        directory_path = sys.argv[1]
    else:
        # Prompt user for directory path
        directory_path = input("Enter directory path (or press Enter for current directory): ").strip()
        
        # Use current directory if no input provided
        if not directory_path:
            directory_path = "."
    
    list_all_files(directory_path)

if __name__ == "__main__":
    main()
