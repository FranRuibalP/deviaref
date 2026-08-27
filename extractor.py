import requests
import json
import time

# --- CONFIGURATION ---
CLIENT_ID = 'YOUR_CLIENT_ID_HERE'
CLIENT_SECRET = 'YOUR_CLIENT_SECRET_HERE'
ARTIST_USERNAME = 'artist_username'
OUTPUT_FILE = 'gallery.json' # This will be saved in the Next.js public/ folder

def get_access_token():
    url = "https://www.deviantart.com/oauth2/token"
    payload = {
        'grant_type': 'client_credentials',
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET
    }
    response = requests.post(url, data=payload)
    response.raise_for_status()
    return response.json()['access_token']

def get_gallery_folders(token, username):
    url = f"https://www.deviantart.com/api/v1/oauth2/gallery/folders?username={username}"
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(url, headers=headers)
    return response.json().get('results', [])

def get_images_from_folder(token, username, folder_id):
    images = []
    offset = 0
    has_more = True
    
    while has_more:
        url = f"https://www.deviantart.com/api/v1/oauth2/gallery/{folder_id}?username={username}&offset={offset}&limit=24"
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(url, headers=headers)
        data = response.json()
        
        for item in data.get('results', []):
            if 'content' in item: # Ensure the item is an image
                images.append({
                    'id': item['deviationid'],
                    'title': item['title'],
                    'url': item['content']['src']
                })
        
        has_more = data.get('has_more', False)
        offset = data.get('next_offset', offset)
        time.sleep(0.5) # Respect the API rate limit
        
    return images

def main():
    print("Authenticating...")
    token = get_access_token()
    
    print(f"Fetching folders for {ARTIST_USERNAME}...")
    folders = get_gallery_folders(token, ARTIST_USERNAME)
    
    gallery_data = []
    
    for folder in folders:
        folder_name = folder['name']
        folder_id = folder['folderid']
        print(f"Downloading data from folder: {folder_name}")
        
        images = get_images_from_folder(token, ARTIST_USERNAME, folder_id)
        
        # Append metadata
        for img in images:
            img['folder'] = folder_name
            gallery_data.append(img)
            
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(gallery_data, f, ensure_ascii=False, indent=2)
        
    print(f"Done! Saved {len(gallery_data)} images to {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
