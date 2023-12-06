import json
import gzip

# Function to process the file and save the results in a new file
def process_and_save_file(input_file, output_file):
    with gzip.open(input_file, 'rt', encoding='utf-8') as file_in, open(output_file, 'w', encoding='utf-8') as file_out:
        for line in file_in:
            data = json.loads(line)
            if 'embed' in data:
                # Convert each float in the 'embed' list to a 6 decimal point format
                data['embed'] = [round(num, 6) for num in data['embed']]
            # Write the updated line to the new file
            json.dump(data, file_out)
            file_out.write('\n')

# File paths
input_file = 'emoji-embeddings.jsonl.gz'
output_file = 'processed_emoji-embeddings.jsonl'

# Process and save the file
process_and_save_file(input_file, output_file)

