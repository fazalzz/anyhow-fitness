# 📧 Gmail SMTP Setup for Anyhow Fitness 2FA

## 🔑 **Get Gmail App Password (Required for 2FA emails)**

### **Step 1: Enable 2-Factor Authentication on Your Gmail**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **2-Step Verification**
3. Follow the steps to enable 2FA if not already enabled

### **Step 2: Generate App Password**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **2-Step Verification**
3. Scroll down and click **App passwords**
4. Select "Mail" and "Other (Custom name)"
5. Enter "Anyhow Fitness App" as the name
6. Click **Generate**
7. **Copy the 16-character password** (like: `abcd efgh ijkl mnop`)

### **Step 3: Update .env File**
Replace `YOUR_GMAIL_APP_PASSWORD_HERE` in your `.env` file with the app password:

```env
SMTP_PASS=abcd efgh ijkl mnop
```

⚠️ **Important**: Use the App Password, NOT your regular Gmail password!

### **Step 4: Redeploy**
Run the deployment commands to update Cloud Run with new SMTP settings.

## 🧪 **Testing**
After setup, try logging into your app. You should receive 2FA codes at `fazalzz@gmail.com`.

## 🔐 **Security Notes**
- App passwords are safer than using your main password
- You can revoke app passwords anytime from Google Account settings
- Never share your app password publicly