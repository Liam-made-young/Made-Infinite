#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🎵 MADE INFINITE Setup Script\n');
console.log('This script will help you configure your music portal.\n');

const questions = [
    {
        key: 'ADMIN_PASSWORD',
        prompt: 'Enter admin password (secure password for admin access): ',
        default: 'admin123'
    },
    {
        key: 'GOOGLE_CLIENT_ID',
        prompt: 'Enter Google Client ID: ',
        default: ''
    },
    {
        key: 'GOOGLE_CLIENT_SECRET',
        prompt: 'Enter Google Client Secret: ',
        default: ''
    },
    {
        key: 'GOOGLE_REFRESH_TOKEN',
        prompt: 'Enter Google Refresh Token: ',
        default: ''
    },
    {
        key: 'GOOGLE_DRIVE_FOLDER_ID',
        prompt: 'Enter Google Drive Folder ID: ',
        default: ''
    },
    {
        key: 'SESSION_SECRET',
        prompt: 'Enter session secret (random string for security): ',
        default: generateRandomString(32)
    }
];

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

async function askQuestion(question) {
    return new Promise((resolve) => {
        const prompt = question.default ? 
            `${question.prompt}[${question.default}] ` : 
            question.prompt;
        
        rl.question(prompt, (answer) => {
            resolve(answer.trim() || question.default);
        });
    });
}

async function main() {
    const config = {
        PORT: '3000',
        NODE_ENV: 'development'
    };

    console.log('Please provide the following configuration values:\n');

    for (const question of questions) {
        config[question.key] = await askQuestion(question);
    }

    // Generate .env file content
    const envContent = Object.entries(config)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    const fullEnvContent = `# MADE INFINITE Configuration
# Generated on ${new Date().toISOString()}

# Server Configuration
PORT=${config.PORT}
NODE_ENV=${config.NODE_ENV}

# Admin Authentication
ADMIN_PASSWORD=${config.ADMIN_PASSWORD}

# Google Drive API Configuration
GOOGLE_CLIENT_ID=${config.GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${config.GOOGLE_CLIENT_SECRET}
GOOGLE_REFRESH_TOKEN=${config.GOOGLE_REFRESH_TOKEN}
GOOGLE_DRIVE_FOLDER_ID=${config.GOOGLE_DRIVE_FOLDER_ID}

# Session Secret
SESSION_SECRET=${config.SESSION_SECRET}

# Optional: MongoDB URI (for future features)
# MONGODB_URI=mongodb://localhost:27017/made-infinite

# Production hosting URL (uncomment and set when deploying)
# HOSTING_URL=https://your-app.herokuapp.com
`;

    try {
        fs.writeFileSync('.env', fullEnvContent);
        console.log('\n✅ Configuration saved to .env file');
        
        // Check if package.json exists
        if (!fs.existsSync('package.json')) {
            console.log('\n⚠️  package.json not found. Run "npm install" to install dependencies.');
        }
        
        // Check if credentials.json exists
        if (!fs.existsSync('credentials.json')) {
            console.log('\n⚠️  credentials.json not found.');
            console.log('   Please download your Google Drive service account key and rename it to credentials.json');
        }
        
        console.log('\n🚀 Next steps:');
        console.log('1. Make sure you have credentials.json (Google Drive service account key)');
        console.log('2. Run "npm install" to install dependencies');
        console.log('3. Run "npm run dev" to start the development server');
        console.log('4. Visit http://localhost:3000 to test your music portal');
        console.log('\n📖 Read README.md for detailed setup instructions');
        
    } catch (error) {
        console.error('\n❌ Error saving configuration:', error.message);
    }

    rl.close();
}

main().catch(console.error); 