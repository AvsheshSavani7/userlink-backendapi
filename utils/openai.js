const axios = require("axios");

/**
 * Utility functions for working with OpenAI API
 */
const openaiApi = {
  /**
   * Get headers for OpenAI API requests
   */
  getHeaders() {
    const apiKey = process.env.OPENAI_API_KEY;
    const orgId = process.env.OPENAI_ORG_ID;

    // Check if it's a project API key (starts with sk-proj-)
    const isProjectKey = apiKey.startsWith("sk-proj-");

    const headers = {
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v2",
      Authorization: `Bearer ${apiKey}`
    };

    // Add organization header if available
    if (orgId) {
      headers["OpenAI-Organization"] = orgId;
    }

    return headers;
  },

  /**
   * Create a new assistant
   * @param {Object} assistantData - Assistant configuration
   * @returns {Promise<Object>} - Created assistant
   */
  async createAssistant(assistantData) {
    try {
      const response = await axios.post(
        process.env.OPENAI_ASSISTANT_URL,
        assistantData,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Error creating assistant:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  /**
   * Get all assistants
   * @returns {Promise<Array>} - List of assistants
   */
  async getAssistants() {
    try {
      const response = await axios.get(process.env.OPENAI_ASSISTANT_URL, {
        headers: this.getHeaders()
      });

      return response.data;
    } catch (error) {
      console.error(
        "Error getting assistants:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  /**
   * Get assistant by ID
   * @param {string} assistantId - Assistant ID
   * @returns {Promise<Object>} - Assistant data
   */
  async getAssistant(assistantId) {
    try {
      const response = await axios.get(
        `${process.env.OPENAI_ASSISTANT_URL}/${assistantId}`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Error getting assistant:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  /**
   * Update an assistant
   * @param {string} assistantId - Assistant ID
   * @param {Object} updateData - Updated assistant data
   * @returns {Promise<Object>} - Updated assistant
   */
  async updateAssistant(assistantId, updateData) {
    try {
      const response = await axios.post(
        `${process.env.OPENAI_ASSISTANT_URL}/${assistantId}`,
        updateData,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Error updating assistant:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  /**
   * Delete an assistant
   * @param {string} assistantId - Assistant ID
   * @returns {Promise<Object>} - Deletion response
   */
  async deleteAssistant(assistantId) {
    try {
      const response = await axios.delete(
        `${process.env.OPENAI_ASSISTANT_URL}/${assistantId}`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Error deleting assistant:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  /**
   * Create a new thread in OpenAI
   * @returns {Promise<Object>} - Created thread
   */
  async createThread() {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/threads",
        {},
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Error creating thread:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  /**
   * Delete a thread
   * @param {string} threadId - Thread ID
   * @returns {Promise<Object>} - Deletion response
   */
  async deleteThread(threadId) {
    try {
      const response = await axios.delete(
        `https://api.openai.com/v1/threads/${threadId}`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Error deleting thread:",
        error.response?.data || error.message
      );
      throw error;
    }
  },
  async getThreadMessagess(assistantId) {
    try {
      const response = await axios.get(
        `https://api.openai.com/v1/threads/${assistantId}/messages`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Error getting assistant:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
};

module.exports = openaiApi;
