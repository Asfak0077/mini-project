# 🔧 How to Fix Login & Google Sign-In

The application is currently failing to log in because of two security settings in your external accounts (MongoDB and Google Cloud).

## 1. Fix Database Connection (Backend Error)
**Symptom:** "Network Error" or `ERR_CONNECTION_REFUSED` in console.  
**Cause:** MongoDB Atlas is blocking your IP address.

**Steps to Fix:**
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Go to **Network Access** (left sidebar).
3. Click **+ Add IP Address**.
4. Select **Add Current IP Address**.
5. Click **Confirm**.
6. Wait 1-2 minutes. The backend should automatically connect (check terminal output).

## 2. Fix Google Sign-In (Frontend Error)
**Symptom:** `[GSI_LOGGER]: The given origin is not allowed...` in browser console.  
**Cause:** Google Cloud Console does not recognize `http://localhost:5173` as a safe origin.

**Steps to Fix:**
1. Log in to [Google Cloud Console](https://console.cloud.google.com/).
2. Go to **APIs & Services > Credentials**.
3. Click on your **OAuth 2.0 Client ID** (ending in `...apps.googleusercontent.com`).
4. Under **Authorized JavaScript origins**, add these two URLs:
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
5. Click **Save**.
6. Refresh your browser page.

---
### Verification
Once you have done these steps:
1. Refresh the login page.
2. Top right "Student" login should work.
3. Google Sign-In button should appear and work.
