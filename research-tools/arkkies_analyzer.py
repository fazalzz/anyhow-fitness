#!/usr/bin/env python3
"""
Arkkies Mobile App Network Traffic Analyzer
Helps capture and analyze API calls from the Arkkies mobile app
"""

import json
import requests
import time
from datetime import datetime

class ArkkiesAPIAnalyzer:
    def __init__(self):
        self.captured_requests = []
        self.base_url = "https://arkkies.com"
        
    def analyze_network_traffic(self, traffic_file):
        """
        Analyze captured network traffic from mitmproxy or similar tools
        Expected format: JSON file with request/response pairs
        """
        try:
            with open(traffic_file, 'r') as f:
                traffic_data = json.load(f)
            
            api_endpoints = {}
            
            for request in traffic_data:
                if 'arkkies.com' in request.get('url', ''):
                    method = request.get('method', '')
                    url = request.get('url', '')
                    headers = request.get('headers', {})
                    body = request.get('body', {})
                    response = request.get('response', {})
                    
                    endpoint_key = f"{method} {url.split('arkkies.com')[1] if 'arkkies.com' in url else url}"
                    
                    api_endpoints[endpoint_key] = {
                        'method': method,
                        'url': url,
                        'headers': headers,
                        'request_body': body,
                        'response': response,
                        'timestamp': request.get('timestamp', '')
                    }
            
            # Save analysis results
            with open('arkkies_api_analysis.json', 'w') as f:
                json.dump(api_endpoints, f, indent=2)
                
            print(f"✅ Analyzed {len(api_endpoints)} API endpoints")
            print("📄 Results saved to: arkkies_api_analysis.json")
            
            # Print key endpoints found
            print("\n🔍 Key Endpoints Discovered:")
            for endpoint, data in api_endpoints.items():
                print(f"  {endpoint}")
                if 'login' in endpoint.lower():
                    print("    🔑 LOGIN ENDPOINT FOUND!")
                elif 'booking' in endpoint.lower():
                    print("    📅 BOOKING ENDPOINT FOUND!")
                elif 'qr' in endpoint.lower():
                    print("    🎫 QR CODE ENDPOINT FOUND!")
                elif 'door' in endpoint.lower() or 'unlock' in endpoint.lower():
                    print("    🚪 DOOR CONTROL ENDPOINT FOUND!")
                    
        except Exception as e:
            print(f"❌ Error analyzing traffic: {e}")
    
    def test_endpoint(self, method, endpoint, headers=None, data=None):
        """
        Test discovered API endpoints safely
        """
        url = f"{self.base_url}{endpoint}"
        
        try:
            print(f"🧪 Testing: {method} {url}")
            
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=10)
            else:
                print(f"⚠️  Method {method} not supported in this tester")
                return
                
            print(f"📊 Status: {response.status_code}")
            print(f"📋 Headers: {dict(response.headers)}")
            
            try:
                json_response = response.json()
                print(f"📄 Response: {json.dumps(json_response, indent=2)}")
            except:
                print(f"📄 Response (text): {response.text[:500]}...")
                
        except Exception as e:
            print(f"❌ Error testing endpoint: {e}")
    
    def generate_nodejs_client(self, analysis_file):
        """
        Generate Node.js API client code based on analysis
        """
        try:
            with open(analysis_file, 'r') as f:
                endpoints = json.load(f)
            
            client_code = """
// Auto-generated Arkkies API Client
// Based on mobile app network traffic analysis

class ArkkiesRealAPI {
  constructor() {
    this.baseURL = 'https://arkkies.com';
    this.session = null;
    this.headers = {
      'User-Agent': 'ArkkiesApp/1.0',
      'Content-Type': 'application/json'
    };
  }

"""
            
            # Generate methods for each endpoint
            for endpoint_key, data in endpoints.items():
                method = data['method'].lower()
                url_path = data['url'].replace('https://arkkies.com', '')
                
                if 'login' in endpoint_key.lower():
                    client_code += """
  async login(email, password) {
    const response = await fetch(`${this.baseURL}""" + url_path + """`, {
      method: '""" + method.upper() + """',
      headers: this.headers,
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (data.token || data.session) {
      this.session = data.token || data.session;
      this.headers['Authorization'] = `Bearer ${this.session}`;
    }
    return data;
  }
"""
                
                elif 'booking' in endpoint_key.lower() and method == 'post':
                    client_code += """
  async createBooking(outletId, timeSlot) {
    const response = await fetch(`${this.baseURL}""" + url_path + """`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ outletId, timeSlot })
    });
    return response.json();
  }
"""
                
                elif 'qr' in endpoint_key.lower():
                    client_code += """
  async generateQR(bookingId) {
    const response = await fetch(`${this.baseURL}""" + url_path.replace('{id}', '${bookingId}') + """`, {
      headers: this.headers
    });
    return response.json();
  }
"""
                
                elif any(word in endpoint_key.lower() for word in ['door', 'unlock', 'access']):
                    client_code += """
  async unlockDoor(qrCode, doorId) {
    const response = await fetch(`${this.baseURL}""" + url_path + """`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ qrCode, doorId })
    });
    return response.json();
  }
"""
            
            client_code += """
}

module.exports = ArkkiesRealAPI;
"""
            
            with open('ArkkiesRealAPI.js', 'w') as f:
                f.write(client_code)
                
            print("✅ Generated Node.js API client: ArkkiesRealAPI.js")
            
        except Exception as e:
            print(f"❌ Error generating client: {e}")

def main():
    analyzer = ArkkiesAPIAnalyzer()
    
    print("🔍 Arkkies API Research Tool")
    print("=" * 40)
    
    while True:
        print("\nOptions:")
        print("1. Analyze network traffic file")
        print("2. Test discovered endpoint")
        print("3. Generate Node.js client")
        print("4. Exit")
        
        choice = input("\nSelect option (1-4): ").strip()
        
        if choice == '1':
            file_path = input("Enter path to network traffic JSON file: ").strip()
            analyzer.analyze_network_traffic(file_path)
            
        elif choice == '2':
            method = input("HTTP method (GET/POST): ").strip()
            endpoint = input("Endpoint path (e.g., /api/login): ").strip()
            analyzer.test_endpoint(method, endpoint)
            
        elif choice == '3':
            analysis_file = input("Enter path to analysis JSON file: ").strip()
            analyzer.generate_nodejs_client(analysis_file)
            
        elif choice == '4':
            print("👋 Happy hacking!")
            break
            
        else:
            print("❌ Invalid option")

if __name__ == "__main__":
    main()