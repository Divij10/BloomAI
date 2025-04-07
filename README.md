# BloomAI

BloomAI is an interactive AR Emotional Mirror web application that uses facial recognition to detect and visualize users' emotions. The application combines computer vision, AR effects, and AI-powered emotional intelligence to create an engaging user experience.

## Features

- **Real-time Emotion Detection**: Detects emotions such as happy, sad, angry, surprised, disgusted, sleepy, and neutral using facial landmarks and OpenAI vision
- **AR Visualization**: Displays beautiful AR effects that change based on detected emotions
- **Emotional Journaling**: Creates AI-assisted journal entries based on your emotional states
- **Weekly Bloom Garden**: Track your emotional well-being with a visual garden that blooms as you check in throughout the week
- **AI Assistant**: Chat with an emotionally-aware AI assistant that responds contextually based on your current emotional state
- **Emoji Reactions**: Add emoji reactions to your past journal entries to reflect on how you feel about those memories
- **Meditation Feature**: Access a calming meditation interface with breathing exercises to help manage stress and anxiety
- **Expandable Chat Interface**: Resize the AI assistant chat for more comfortable conversations
- **Auto-dismissing Guidance**: User-friendly guidance popups that fade out automatically or can be dismissed by clicking

## User Interface

- **Clean, Modern Design**: Intuitive interface with smooth animations and transitions
- **Dark Mode Support**: Easy on the eyes with a carefully designed color scheme
- **Responsive Layout**: Works on desktop and most tablet devices
- **Interactive Elements**: Clickable cards, expandable sections, and visual feedback

## Technologies Used

- Face Mesh from MediaPipe for facial landmark detection
- OpenAI API for enhanced emotion analysis and assistant responses
- Canvas API for AR emotion visualization effects
- Socket.IO for real-time communication
- Express.js for the backend server
- Local Storage for persisting user data between sessions

## System Requirements

- **Node.js**: Version 14.x or higher (latest LTS version recommended)
- **Browser**: Chrome (recommended), Firefox, or Edge with WebRTC support
- **Camera**: Functional webcam for emotion detection
- **OpenAI API Key**: Valid API key with access to GPT-4 Vision

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/Divij10/BloomAI.git
   cd BloomAI
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your OpenAI API key:
   
   Create a `.env` file in the root directory:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```
   
   To get an OpenAI API key:
   - Sign up/Login at [OpenAI](https://platform.openai.com/signup)
   - Navigate to the API section
   - Create a new API key in your account settings
   - Copy the key to your `.env` file

4. Start the server:
   
   Using Node directly:
   ```bash
   node server.js
   ```
   
   Using the provided script (recommended):
   ```bash
   chmod +x start-server.sh  # Make the script executable (first time only)
   ./start-server.sh
   ```
   
   The terminal will display "Server is running on port 3000" when successful.

5. Access the application:
   
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```
   
   You'll first see the welcome page. Click "Get Started" to access the main application.

6. Camera permissions:
   
   When prompted, allow the application to access your camera. This is required for the emotion detection feature to work.

## Using the Application

1. **Welcome Page**: Click "Get Started" to enter the main application
2. **Emotion Detection**: Position your face in the center of the screen
3. **Journaling**: Use the journal section to record your emotions and thoughts
4. **Meditation**: Click the "Meditate" button for a breathing exercise
5. **Chat Assistant**: Use the Bloom Assistant for guidance and conversation
6. **Weekly Progress**: Check your Weekly Bloom to see your progress

## Troubleshooting

- **Camera not working**: Ensure your browser has permission to access the camera and no other application is using it
- **Emotion detection issues**: Make sure your face is well-lit and positioned in the center of the frame
- **Server won't start**: Check that port 3000 is not in use by another application
- **OpenAI API errors**: Verify your API key is correct and has sufficient quota
- **Application not loading**: Clear browser cache and restart the server

To restart the server if needed:
```bash
# Kill any running instance
pkill -f 'node server.js'

# Start the server again
./start-server.sh
```

## Recent Updates

- Added meditation feature with breathing animation and timer
- Implemented expandable chat interface for better conversations
- Fixed Weekly Bloom streak counter to accurately show bloomed days
- Added emoji reactions to journal entries
- Improved UI animations and transitions
- Enhanced modals for viewing journal entries
- Implemented auto-dismissing user guidance

## License

MIT

## Author

Divij Singh Thakur
