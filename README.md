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

## Setup Instructions

1. Clone the repository:
   ```
   git clone https://github.com/Divij10/BloomAI.git
   cd BloomAI
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your OpenAI API key:
   Create a `.env` file in the root directory:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

4. Start the server:
   ```
   node server.js
   ```
   
   Or use the provided script:
   ```
   ./start-server.sh
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
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
