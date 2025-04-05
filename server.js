const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "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", // Fallback to hard-coded key if env var is missing
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Basic API endpoint for emotions
app.post('/api/emotions', (req, res) => {
  console.log('Received emotion data:', req.body);
  res.json({ status: 'success' });
});

// API endpoint for OpenAI emotion analysis
app.post('/api/analyze-emotion', async (req, res) => {
  console.log('Received emotion analysis request');
  
  try {
    // Check if image data is provided
    if (!req.body.imageData) {
      console.error('No image data provided');
      return res.status(400).json({ error: { message: 'Missing image data' } });
    }
    
    console.log('Image data received, processing for OpenAI...');
    
    // Remove the data:image/jpeg;base64, prefix
    const base64Image = req.body.imageData.replace(/^data:image\/\w+;base64,/, '');
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    // Log the size of the image data for debugging
    console.log(`Image buffer size: ${imageBuffer.length} bytes`);
    
    // Create a FormData object with the image
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('image', blob, 'image.jpg');
    
    // Prepare the messages for the API
    const messages = [
      {
        role: "system",
        content: "You are an emotion detection assistant. Analyze the provided facial image and determine the person's emotional state. Choose ONLY ONE of the following emotions that best matches the face: happy, sad, angry, surprised, neutral, sleepy, fearful, disgusted. Response with ONLY the emotion name, nothing else."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "What emotion is shown in this face image?"
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      }
    ];
    
    console.log('Calling OpenAI API...');
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 20
    });
    
    console.log('OpenAI API response received');
    
    // Extract and validate the emotion from OpenAI's response
    const responseText = response.choices[0].message.content.toLowerCase().trim();
    const validEmotions = ['happy', 'sad', 'angry', 'surprised', 'neutral', 'sleepy', 'fearful', 'disgusted'];
    
    // Exact match to ensure we only get valid emotions
    const emotion = validEmotions.includes(responseText) ? responseText : 
                    validEmotions.find(e => responseText.includes(e)) || 'neutral';
    
    // Additional facial data from browser can be used for hybrid approach
    console.log('OpenAI detected emotion:', emotion, 'Full response:', responseText);
    
    return res.json({ 
      emotion,
      confidence: 0.9, // OpenAI doesn't provide confidence scores but we assume high confidence
      openAiResponse: response.choices[0].message.content
    });
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    console.error('Error details:', error.message);
    if (error.response) {
      console.error('OpenAI API error response:', error.response.data);
    }
    
    // Provide more detailed error information
    let errorDetails = {
      message: 'OpenAI service unavailable',
      code: error.code || 'unknown_error',
      type: error.type || 'server_error'
    };
    
    // Use the facial data to determine a fallback emotion if available
    let fallbackEmotion = 'neutral';
    
    if (req.body.faceData && req.body.faceData.metrics) {
      console.log('Using fallback emotion detection with facial metrics');
      // Get metrics from facial data
      const metrics = req.body.faceData.metrics;
      
      // Improved cascading emotion detection with better thresholds
      // Order matters - check the most distinctive expressions first
      if (metrics.normalizedMouthOpenness > 0.15) {
        // Very wide open mouth is surprised
        fallbackEmotion = 'surprised';
      } else if (metrics.eyebrowToEyeRatio < -0.035 && metrics.normalizedMouthWidth < 0.33) {
        // Furrowed brows and narrow mouth is angry
        fallbackEmotion = 'angry';
      } else if (metrics.normalizedEyeOpenness < 0.011) {
        // Very closed eyes is sleepy
        fallbackEmotion = 'sleepy';
      } else if (metrics.smileRatio < -0.02 && metrics.normalizedMouthWidth > 0.42) {
        // Clear smile configuration is happy
        fallbackEmotion = 'happy';
      } else if (metrics.smileRatio > 0.015 && metrics.normalizedMouthWidth < 0.34) {
        // Frown configuration is sad
        fallbackEmotion = 'sad';
      } else {
        // Default is neutral
        fallbackEmotion = 'neutral';
      }
      
      console.log('Fallback emotion:', fallbackEmotion);
    }
    
    // Fallback response so the app continues to work
    return res.status(200).json({ 
      error: errorDetails, 
      emotion: fallbackEmotion,
      fallback: true,
      confidence: 0.5 // Lower confidence for fallback detection
    });
  }
});

// API endpoint for AI assistant
app.post('/api/assistant', async (req, res) => {
  try {
    const { message, currentEmotion, emotionHistory } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Get recent emotions for better context
    const recentEmotions = emotionHistory && emotionHistory.length > 0 
      ? emotionHistory.slice(-5) 
      : [{ emotion: currentEmotion || 'neutral' }];
    
    // Analyze emotion trends
    const emotionSet = new Set(recentEmotions.map(e => e.emotion || 'neutral'));
    const emotionTrend = emotionSet.size === 1 
      ? 'consistent' 
      : emotionSet.has(currentEmotion) && emotionSet.size <= 3 
        ? 'fluctuating' : 'shifting';
    
    // Call OpenAI for assistant response
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Bloom, an empathetic AI assistant for an AR Emotional Mirror application specialized in emotional intelligence.
          
          USER'S EMOTIONAL STATE:
          - Current detected emotion: ${currentEmotion || 'neutral'}
          - Recent emotion pattern: ${emotionTrend}
          - Emotion history: ${JSON.stringify(recentEmotions.map(e => e.emotion))}
          
          GUIDELINES FOR YOUR RESPONSE:
          1. IMPORTANT: Actively and explicitly reference their current emotion in your response. Make your emotional awareness a central part of your interaction.
          2. Dynamically adjust your personality, tone, and language based on their emotional state:
             - Happy: Be energetic, celebratory, and match their positive energy with enthusiasm
             - Sad: Be gentle, nurturing, and offer genuine comfort and validation
             - Angry: Be calm, validating, and help them process their feelings constructively
             - Surprised: Be curious, engaging, and show interest in what surprised them
             - Neutral: Be balanced, thoughtful, and engage them about their day
             - Sleepy: Be soothing, gentle, and use simple language
             - Fearful: Be grounding, reassuring, and offer practical support
             - Disgusted: Be understanding, non-judgmental, and offer perspective
          3. Use emotional mirroring techniques to build rapport - reflect similar emotional tones in your response
          4. If their emotion has changed recently, acknowledge this transition in a natural way
          5. Offer brief suggestions or questions related to their emotional state to show genuine care
          6. Be more expressive with your language - use more emotional words, varied punctuation, and appropriate emphasis`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 200
    });
    
    // Get the assistant's response
    const assistantResponse = response.choices[0].message.content;
    
    return res.json({ 
      response: assistantResponse,
      emotion: currentEmotion
    });
  } catch (error) {
    console.error('Error with AI assistant:', error);
    return res.status(500).json({ 
      error: 'Error generating assistant response',
      response: "I'm having trouble responding right now. Let's try again later."
    });
  }
});

// API endpoint for emotional guidance
app.post('/api/guidance', async (req, res) => {
  try {
    const { currentEmotion, emotionHistory, dominantEmotions, isJournalEntry, userAnswers } = req.body;
    
    // Prepare emotion data for context
    const emotion = currentEmotion || 'neutral';
    const history = emotionHistory || [];
    
    // Use dominant emotions from the client if provided, otherwise calculate from history
    const emotionCounts = history.reduce((counts, item) => {
      counts[item.emotion] = (counts[item.emotion] || 0) + 1;
      return counts;
    }, {});
    
    // Determine dominant emotions if not provided
    const sortedEmotions = dominantEmotions || 
      Object.entries(emotionCounts)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);
    
    // Different system prompt based on whether this is for a journal entry or guidance
    let systemPrompt = "";
    
    if (isJournalEntry) {
      // If user answers are provided, use them to create a personalized journal entry
      if (userAnswers && Object.keys(userAnswers).length > 0) {
        systemPrompt = `You are Bloom, an empathetic emotional journaling assistant.
        Write a thoughtful journal entry for the user based on their emotional state and their answers to your questions.
        
        The user's current emotion is: ${emotion}.
        Their most frequent emotions today are: ${sortedEmotions.join(', ')}.
        
        USER'S ANSWERS TO YOUR QUESTIONS:
        ${Object.entries(userAnswers).map(([question, answer]) => `Q: ${question}\nA: ${answer}`).join('\n\n')}
        
        Create a personalized reflective journal entry that:
        1. Incorporates their answers naturally into a cohesive narrative
        2. Acknowledges their emotional journey today with empathy and insight
        3. Explores patterns or triggers that might have influenced their emotional state
        4. Offers gentle perspective that respects their unique experiences
        5. Ends with an encouraging thought or gentle challenge for tomorrow
        
        Write in first person as if the user wrote it themselves - use "I feel..." not "You feel..."
        Keep the tone warm, reflective, and authentic - like a thoughtful personal journal entry.
        The entry should be 200-300 words and include paragraph breaks for readability.
        Focus on emotions and personal growth, making connections between their answers.`;
      } else {
        systemPrompt = `You are Bloom, an empathetic emotional journaling assistant. 
        Write a thoughtful journal entry for the user based on their emotional state.
        
        The user's current emotion is: ${emotion}.
        Their most frequent emotions today are: ${sortedEmotions.join(', ')}.
        
        Create a reflective journal entry that:
        1. Acknowledges their emotional journey today with empathy and insight
        2. Explores possible sources of these emotions in a thoughtful way
        3. Identifies patterns or triggers that might have influenced their emotional state
        4. Offers gentle perspective on how these emotions might be serving them
        5. Ends with an encouraging thought for tomorrow
        
        Write in first person as if the user wrote it themselves - use "I feel..." not "You feel..."
        Keep the tone warm, reflective, and authentic - like a thoughtful personal journal entry.
        The entry should be 150-250 words and include paragraph breaks for readability.
        Focus on emotions rather than specific activities since you don't know their actual day.`;
      }
    } else {
      systemPrompt = `You are Bloom, an empathetic emotional wellbeing assistant. Provide personalized guidance based on the user's emotional state.
      The user's current emotion is: ${emotion}.
      Their most frequent emotions recently are: ${sortedEmotions.join(', ')}.
      
      Provide tailored advice that:
      1. Acknowledges their current emotional state with empathy
      2. Offers 2-3 practical suggestions for managing or harnessing their current emotion
      3. Ends with a single uplifting or grounding statement, depending on what's appropriate
      
      Keep the total response under 120 words and focus on practical, actionable guidance.`;
    }
    
    // Call OpenAI for personalized guidance or journal entry
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: isJournalEntry 
            ? userAnswers 
              ? "Please create a personalized journal entry based on my answers and emotions."
              : "Please create a journal entry based on my emotions today."
            : "Please give me some guidance based on my emotional state."
        }
      ],
      max_tokens: isJournalEntry ? 500 : 200
    });
    
    // Get the guidance or journal entry response
    const content = response.choices[0].message.content;
    
    return res.json({ 
      guidance: content,
      emotion: emotion,
      isJournalEntry: isJournalEntry || false
    });
  } catch (error) {
    console.error('Error generating guidance:', error);
    return res.status(500).json({ 
      error: 'Error generating content',
      guidance: isJournalEntry 
        ? "I'm having trouble creating your journal entry right now. Please try again later."
        : "I'm having trouble creating personalized guidance right now. Try again later."
    });
  }
});

// New endpoint: Generate journal questions based on emotions
app.post('/api/journal-questions', async (req, res) => {
  try {
    const { currentEmotion, emotionHistory, dominantEmotions } = req.body;
    
    // Prepare emotion data for context
    const emotion = currentEmotion || 'neutral';
    const history = emotionHistory || [];
    
    // Calculate dominant emotions if not provided
    const emotionCounts = history.reduce((counts, item) => {
      counts[item.emotion] = (counts[item.emotion] || 0) + 1;
      return counts;
    }, {});
    
    const sortedEmotions = dominantEmotions || 
      Object.entries(emotionCounts)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);
    
    // Call OpenAI to generate personalized journal questions
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Bloom, an empathetic emotional journaling assistant. Generate 4-5 thoughtful questions to help the user reflect on their emotions.
          
          The user's current emotion is: ${emotion}.
          Their most frequent emotions today are: ${sortedEmotions.join(', ')}.
          
          Create questions that:
          1. Are open-ended and thought-provoking
          2. Encourage self-reflection about their emotional state
          3. Help them explore the underlying reasons for their emotions
          4. Prompt consideration of patterns, triggers, and personal growth
          5. Are tailored specifically to their current emotional state
          
          Format your response as a JSON array of strings, with each string being a complete question.
          Example: ["Question 1?", "Question 2?", "Question 3?", "Question 4?"]
          
          Make sure the questions feel personal, empathetic, and relevant to their specific emotions.
          The questions should be diverse and explore different aspects of their emotional experience.`
        },
        {
          role: "user",
          content: "Please generate journal reflection questions based on my current emotional state."
        }
      ],
      max_tokens: 400,
      response_format: { type: "json_object" }
    });
    
    // Parse the JSON response from OpenAI
    let questions = [];
    try {
      const jsonResponse = JSON.parse(response.choices[0].message.content);
      questions = jsonResponse.questions || [];
      
      // If the format is unexpected, handle gracefully
      if (!Array.isArray(questions)) {
        questions = Object.values(jsonResponse).filter(item => typeof item === 'string');
      }
    } catch (e) {
      console.error('Error parsing questions JSON:', e);
      // Extract questions from text if JSON parsing fails
      const content = response.choices[0].message.content;
      const matches = content.match(/"([^"]+)\?"/g);
      if (matches) {
        questions = matches.map(q => q.replace(/"/g, ''));
      } else {
        questions = ["How would you describe your emotional state today?", 
                    "What triggered your current feelings?", 
                    "How have your emotions evolved throughout the day?", 
                    "What would help you process these feelings?"];
      }
    }
    
    return res.json({ 
      questions: questions,
      emotion: emotion
    });
  } catch (error) {
    console.error('Error generating journal questions:', error);
    return res.status(500).json({ 
      error: 'Error generating questions',
      questions: ["How would you describe your emotional state today?", 
                "What triggered your current feelings?", 
                "How have your emotions evolved throughout the day?", 
                "What would help you process these feelings?"]
    });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Handle new emotion events
  socket.on('newEmotion', (emotionData) => {
    console.log('New emotion:', emotionData);
    // Broadcast to all other clients
    socket.broadcast.emit('emotionUpdate', emotionData);
  });
  
  // Handle AI assistant messages
  socket.on('assistantMessage', (messageData) => {
    console.log('New assistant message:', messageData);
    // Store message locally (no broadcasting needed for personal assistant)
    // Send confirmation back to sender
    socket.emit('assistantResponse', {
      status: 'received',
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 