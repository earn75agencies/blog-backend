/**
 * ElevenLabs Service - Text-to-Speech
 * Converts blog posts to audio podcasts
 */

const axios = require('axios');
const { elevenlabs: config } = require('../../config/ai.config');
const { uploadBuffer } = require('../../config/cloudinary.config');

class ElevenLabsService {
  constructor() {
    this.apiKey = config.apiKey;
    this.voiceId = config.voiceId;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    
    if (!this.apiKey) {
      console.warn('⚠️  ElevenLabs API key not configured');
    } else {
      console.log('✅ ElevenLabs service initialized');
    }
  }

  /**
   * Check if service is available
   */
  isAvailable() {
    return this.apiKey !== null && this.apiKey !== undefined;
  }

  /**
   * Generate audio from text
   */
  async generateAudio(text, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs service not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${options.voiceId || this.voiceId}`,
        {
          text: text.substring(0, 5000), // Limit text length
          model_id: config.model,
          voice_settings: {
            stability: options.stability || 0.5,
            similarity_boost: options.similarityBoost || 0.75,
            style: options.style || 0,
            use_speaker_boost: options.useSpeakerBoost || true,
          }
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: 60000, // 60 seconds
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error('ElevenLabs generation error:', error.message);
      
      if (error.response) {
        const errorData = error.response.data.toString();
        throw new Error(`ElevenLabs API error: ${errorData}`);
      }
      
      throw new Error(`Failed to generate audio: ${error.message}`);
    }
  }

  /**
   * Generate podcast from blog post
   */
  async generatePostPodcast(post, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs service not configured');
    }

    try {
      // Convert HTML content to plain text
      const plainText = this.stripHtml(post.content);
      
      // Create podcast script
      const script = this.createPodcastScript(post.title, post.excerpt, plainText);
      
      // Generate audio
      console.log(`🎙️ Generating podcast for post: ${post.title}`);
      const audioBuffer = await this.generateAudio(script, options);
      
      // Upload to Cloudinary
      console.log('📤 Uploading podcast to Cloudinary...');
      const uploadResult = await uploadBuffer(audioBuffer, {
        resource_type: 'video',
        format: 'mp3',
        folder: 'podcasts',
        public_id: `podcast_${post._id}_${Date.now()}`,
      });

      console.log(`✅ Podcast generated: ${uploadResult.secure_url}`);
      
      return {
        url: uploadResult.secure_url,
        duration: uploadResult.duration,
        size: audioBuffer.length,
        format: 'mp3',
      };
    } catch (error) {
      console.error('Generate podcast error:', error.message);
      throw error;
    }
  }

  /**
   * Create podcast script from post
   */
  createPodcastScript(title, excerpt, content) {
    // Clean and format content
    const cleanContent = content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 4000); // Limit length (ElevenLabs has limits)

    return `
      Welcome to this audio version of: ${title}.
      
      ${excerpt || ''}
      
      ${cleanContent}
      
      Thank you for listening. Visit our website for more content.
    `.trim();
  }

  /**
   * Strip HTML tags from content
   */
  stripHtml(html) {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp;
      .replace(/&amp;/g, '&') // Replace &amp;
      .replace(/&lt;/g, '<') // Replace &lt;
      .replace(/&gt;/g, '>') // Replace &gt;
      .replace(/&quot;/g, '"') // Replace &quot;
      .replace(/&#39;/g, "'") // Replace &#39;
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Get available voices
   */
  async getVoices() {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs service not configured');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/voices`,
        {
          headers: {
            'xi-api-key': this.apiKey,
          },
        }
      );

      return response.data.voices.map(voice => ({
        id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description,
      }));
    } catch (error) {
      console.error('Get voices error:', error.message);
      throw new Error(`Failed to get voices: ${error.message}`);
    }
  }

  /**
   * Get account usage
   */
  async getUsage() {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs service not configured');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/user/subscription`,
        {
          headers: {
            'xi-api-key': this.apiKey,
          },
        }
      );

      const subscription = response.data;
      
      return {
        characterCount: subscription.character_count,
        characterLimit: subscription.character_limit,
        remainingCharacters: subscription.character_limit - subscription.character_count,
        resetDate: new Date(subscription.next_character_count_reset_unix * 1000),
        tier: subscription.tier,
      };
    } catch (error) {
      console.error('Get usage error:', error.message);
      throw new Error(`Failed to get usage: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new ElevenLabsService();