// Test script to diagnose and fix Arkkies 500 error

const baseUrl = 'https://anyhow-fitness-api-236180381075.us-central1.run.app';

// Test 1: Check if we can validate auth
async function testAuth() {
  try {
    const response = await fetch(`${baseUrl}/api/auth/validate`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE' // User needs to replace this
      }
    });
    const data = await response.json();
    console.log('Auth validation:', data);
    return data.success;
  } catch (error) {
    console.error('Auth test failed:', error.message);
    return false;
  }
}

// Test 2: Try to book-and-access without credentials (should fail with clear error)
async function testBookAndAccessWithoutCredentials() {
  try {
    const response = await fetch(`${baseUrl}/api/arkkies/book-and-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE' // User needs to replace this
      },
      body: JSON.stringify({
        homeOutletId: 'hdb-outlet-id',
        targetOutletId: 'destination-outlet-id'
      })
    });
    
    const data = await response.json();
    console.log('Book and access without credentials:', {
      status: response.status,
      data: data
    });
    
    if (response.status === 500 && data.error === 'Arkkies credentials not configured for this user') {
      console.log('✅ ISSUE CONFIRMED: User needs to login to Arkkies first');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Book and access test failed:', error.message);
    return false;
  }
}

// Test 3: Login to Arkkies (user needs to provide real credentials)
async function testArkkiesLogin() {
  try {
    const response = await fetch(`${baseUrl}/api/arkkies/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE' // User needs to replace this
      },
      body: JSON.stringify({
        email: 'YOUR_ARKKIES_EMAIL',
        password: 'YOUR_ARKKIES_PASSWORD'
      })
    });
    
    const data = await response.json();
    console.log('Arkkies login:', {
      status: response.status,
      data: data
    });
    
    return response.status === 200 && data.success;
  } catch (error) {
    console.error('Arkkies login test failed:', error.message);
    return false;
  }
}

console.log('🧪 Testing Arkkies integration flow...');
console.log('');
console.log('INSTRUCTIONS:');
console.log('1. Replace YOUR_JWT_TOKEN_HERE with your actual JWT token');
console.log('2. Replace YOUR_ARKKIES_EMAIL and YOUR_ARKKIES_PASSWORD with your actual Arkkies credentials');
console.log('3. Run this script to test the flow');
console.log('');
console.log('EXPECTED ISSUE:');
console.log('- Users are getting 500 errors because they haven\'t connected their Arkkies account yet');
console.log('- They need to call /api/arkkies/login FIRST to store their credentials');
console.log('- Only AFTER successful login can they use /api/arkkies/book-and-access');
console.log('');
console.log('SOLUTION:');
console.log('- Add an Arkkies connection UI in the frontend');
console.log('- User enters their Arkkies email/password');
console.log('- Frontend calls /api/arkkies/login to store credentials');
console.log('- Then book-and-access will work');