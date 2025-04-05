# BloomAI

BloomAI is an interactive AR Emotional Mirror web application that uses facial recognition to detect and visualize users' emotions. The application combines computer vision, AR effects, and AI-powered emotional intelligence to create an engaging user experience.

## Features

- **Real-time Emotion Detection**: Detects emotions such as happy, sad, angry, surprised, sleepy, and neutral using facial landmarks
- **Emotional Journaling**: Creates AI-assisted journal entries based on your emotional states
- **Daily Streaks**: Track your emotional well-being with a visual garden that blooms as you check in daily
- **AI Assistant**: Chat with an emotionally-aware AI assistant that responds contextually based on your current emotional state

## Technologies Used

- Face Mesh from MediaPipe for facial landmark detection
- OpenAI API for enhanced emotion analysis and assistant responses
- Canvas API for AR emotion visualization effects
- Socket.IO for real-time communication
- Express.js for the backend server

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

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## License

MIT

## Author

Divij Singh Thakur
