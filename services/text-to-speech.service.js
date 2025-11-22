/**
 * Text-to-Speech Service
 * Handles TTS generation using various providers
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { uploadImage } = require('../config/cloudinary.config');

class TextToSpeechService {
  constructor() {
    this.provider = process.env.TTS_PROVIDER || 'webapi'; // 'google', 'aws', 'webapi'
    this.googleApiKey = process.env.GOOGLE_TTS_API_KEY;
    this.awsRegion = process.env.AWS_REGION;
    this.awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    this.awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  }

  /**
   * Generate TTS audio from text
   * @param {string} text - Text to convert to speech
   * @param {Object} options - TTS options
   * @returns {Promise<Object>} Audio URL and metadata
   */
  async generateAudio(text, options = {}) {
    const {
      language = 'en',
      voice = 'neutral',
      speed = 1.0,
      pitch = 1.0,
      format = 'mp3',
    } = options;

    // Clean and prepare text
    const cleanText = this.prepareText(text);

    try {
      let audioBuffer;
      let audioUrl;

      // Try provider-specific generation
      switch (this.provider) {
        case 'google':
          audioBuffer = await this.generateGoogleTTS(cleanText, { language, voice, speed, pitch });
          break;
        case 'aws':
          audioBuffer = await this.generateAWSPolly(cleanText, { language, voice, speed, pitch });
          break;
        case 'webapi':
        default:
          audioBuffer = await this.generateWebAPI(cleanText, { language, voice, speed, pitch });
          break;
      }

      // Upload audio to Cloudinary
      const tempFilePath = path.join(__dirname, '../../uploads', `tts_${Date.now()}.${format}`);
      
      // Ensure uploads directory exists
      const uploadsDir = path.dirname(tempFilePath);
      try {
        await fs.mkdir(uploadsDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      // Write buffer to temp file
      await fs.writeFile(tempFilePath, audioBuffer);

      // Upload to Cloudinary
      const cloudinary = require('cloudinary').v2;
      const cloudinaryResult = await cloudinary.uploader.upload(tempFilePath, {
        resource_type: 'video', // Cloudinary uses 'video' for audio files
        folder: 'gidi-blog/tts',
        format: format,
      });

      // Clean up temp file
      try {
        await fs.unlink(tempFilePath);
      } catch (error) {
        console.warn('Failed to delete temp TTS file:', error.message);
      }

      audioUrl = cloudinaryResult.secure_url;

      // Calculate duration (approximate: ~150 characters per second at normal speed)
      const duration = Math.ceil(cleanText.length / (150 * speed));

      return {
        audioUrl,
        duration,
        format,
        language,
        voice,
        speed,
        pitch,
      };
    } catch (error) {
      console.error('TTS Generation Error:', error);
      throw new Error(`Failed to generate text-to-speech: ${error.message}`);
    }
  }

  /**
   * Generate TTS using Google Cloud TTS API
   */
  async generateGoogleTTS(text, options) {
    if (!this.googleApiKey) {
      throw new Error('Google TTS API key not configured');
    }

    // Google TTS API endpoint
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.googleApiKey}`;

    const requestBody = {
      input: { text },
      voice: {
        languageCode: options.language,
        name: this.getGoogleVoiceName(options.language, options.voice),
        ssmlGender: options.voice === 'male' ? 'MALE' : 'FEMALE',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: options.speed,
        pitch: options.pitch,
      },
    };

    const response = await axios.post(url, requestBody, {
      headers: { 'Content-Type': 'application/json' },
    });

    // Decode base64 audio
    return Buffer.from(response.data.audioContent, 'base64');
  }

  /**
   * Generate TTS using AWS Polly
   */
  async generateAWSPolly(text, options) {
    // AWS Polly would require AWS SDK
    // For now, fallback to web API if AWS not configured
    if (!this.awsAccessKeyId || !this.awsSecretAccessKey) {
      console.warn('AWS credentials not configured, falling back to web API');
      return this.generateWebAPI(text, options);
    }

    // Note: Full AWS Polly implementation would require aws-sdk
    // This is a placeholder structure - in production, install @aws-sdk/client-polly
    throw new Error('AWS Polly implementation requires @aws-sdk/client-polly package');
  }

  /**
   * Generate TTS using free web API (gTTS-like service)
   */
  async generateWebAPI(text, options) {
    // Use a free TTS web API
    // Option 1: Use Google Translate TTS (free, no API key needed)
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${options.language}&client=tw-ob`;

    try {
      const response = await axios.get(ttsUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      return Buffer.from(response.data);
    } catch (error) {
      // Fallback: Try alternative TTS service
      return this.generateAlternativeTTS(text, options);
    }
  }

  /**
   * Alternative TTS using responsivevoice.org or similar
   */
  async generateAlternativeTTS(text, options) {
    // For production, you might want to use a service like:
    // - ResponsiveVoice (requires API key)
    // - Azure Cognitive Services
    // - Or generate a simple audio file server-side
    
    // This is a fallback that creates a simple notification
    // In production, implement proper TTS service integration
    throw new Error('TTS service unavailable. Please configure a TTS provider.');
  }

  /**
   * Get Google Cloud TTS voice name based on language and voice type
   */
  getGoogleVoiceName(language, voiceType) {
    const voices = {
      en: {
        neutral: 'en-US-Neutral2-J',
        male: 'en-US-Standard-D',
        female: 'en-US-Standard-E',
      },
      es: {
        neutral: 'es-US-Neural2-A',
        male: 'es-ES-Standard-D',
        female: 'es-ES-Standard-C',
      },
      fr: {
        neutral: 'fr-FR-Neural2-A',
        male: 'fr-FR-Standard-D',
        female: 'fr-FR-Standard-C',
      },
    };

    const langCode = language.split('-')[0];
    const voiceMap = voices[langCode] || voices.en;
    return voiceMap[voiceType] || voiceMap.neutral;
  }

  /**
   * Prepare text for TTS
   */
  prepareText(text) {
    // Remove HTML tags
    let clean = text.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    clean = clean
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Remove excessive whitespace
    clean = clean.replace(/\s+/g, ' ').trim();

    // Limit text length (most TTS APIs have limits)
    const maxLength = 5000;
    if (clean.length > maxLength) {
      clean = clean.substring(0, maxLength) + '...';
    }

    return clean;
  }
}

module.exports = new TextToSpeechService();

