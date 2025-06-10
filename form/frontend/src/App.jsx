import React, { useState } from 'react';
import { Globe, Link, Copy, Download, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import './App.css';

export default function App() {
  const [formUrl, setFormUrl] = useState('');
  const [originalForm, setOriginalForm] = useState(null);
  const [translatedForm, setTranslatedForm] = useState(null);
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'nl', name: 'Dutch' },
    { code: 'sv', name: 'Swedish' },
    { code: 'da', name: 'Danish' },
    { code: 'no', name: 'Norwegian' }
  ];

  const validateGoogleFormUrl = (url) => {
    const googleFormRegex = /^https:\/\/docs\.google\.com\/forms\/d\/[a-zA-Z0-9-_]+/;
    return googleFormRegex.test(url);
  };

  const extractFormData = async (url) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockFormData = {
      title: "Customer Feedback Survey",
      description: "Please take a few minutes to share your experience with our service. Your feedback helps us improve.",
      questions: [
        {
          id: 1,
          text: "What is your name?",
          type: "text",
          required: true,
          options: []
        },
        {
          id: 2,
          text: "How would you rate our service?",
          type: "multiple-choice",
          required: true,
          options: ["Excellent", "Good", "Average", "Poor", "Very Poor"]
        },
        {
          id: 3,
          text: "Which services did you use?",
          type: "checkbox",
          required: false,
          options: ["Customer Support", "Product Consultation", "Technical Assistance", "Billing Support"]
        },
        {
          id: 4,
          text: "How did you hear about us?",
          type: "dropdown",
          required: false,
          options: ["Google Search", "Social Media", "Friend Referral", "Advertisement", "Other"]
        },
        {
          id: 5,
          text: "Please provide any additional comments or suggestions:",
          type: "paragraph",
          required: false,
          options: []
        }
      ],
      settings: {
        collectEmail: true,
        requireSignIn: false,
        allowResponseEditing: true
      }
    };
    
    return mockFormData;
  };

  const translateText = async (text, from, to) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const mockTranslations = {
      'en-es': {
        'Customer Feedback Survey': 'Encuesta de Comentarios del Cliente',
        'Please take a few minutes to share your experience with our service. Your feedback helps us improve.': 'Tómese unos minutos para compartir su experiencia con nuestro servicio. Sus comentarios nos ayudan a mejorar.',
        'What is your name?': '¿Cuál es su nombre?',
        'How would you rate our service?': '¿Cómo calificaría nuestro servicio?',
        'Which services did you use?': '¿Qué servicios utilizó?',
        'How did you hear about us?': '¿Cómo se enteró de nosotros?',
        'Please provide any additional comments or suggestions:': 'Proporcione comentarios o sugerencias adicionales:',
        'Excellent': 'Excelente',
        'Good': 'Bueno',
        'Average': 'Promedio',
        'Poor': 'Malo',
        'Very Poor': 'Muy Malo',
        'Customer Support': 'Soporte al Cliente',
        'Product Consultation': 'Consulta de Producto',
        'Technical Assistance': 'Asistencia Técnica',
        'Billing Support': 'Soporte de Facturación',
        'Google Search': 'Búsqueda de Google',
        'Social Media': 'Redes Sociales',
        'Friend Referral': 'Referencia de Amigo',
        'Advertisement': 'Publicidad',
        'Other': 'Otro'
      }
    };
    
    const key = `${from}-${to}`;
    return mockTranslations[key]?.[text] || `[${to.toUpperCase()}] ${text}`;
  };

  const handleExtractForm = async () => {
    if (!formUrl.trim()) {
      setError('Please enter a Google Form URL');
      return;
    }

    if (!validateGoogleFormUrl(formUrl)) {
      setError('Please enter a valid Google Form URL (e.g., https://docs.google.com/forms/d/...)');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);
    setOriginalForm(null);
    setTranslatedForm(null);

    try {
      const formData = await extractFormData(formUrl);
      setOriginalForm(formData);
      setSuccess('Form extracted successfully!');
    } catch (err) {
      setError('Failed to extract form data. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!originalForm) return;

    setIsTranslating(true);
    setError('');

    try {
      const translatedTitle = await translateText(originalForm.title, sourceLanguage, targetLanguage);
      const translatedDescription = await translateText(originalForm.description, sourceLanguage, targetLanguage);
      
      const translatedQuestions = await Promise.all(
        originalForm.questions.map(async (question) => {
          const translatedText = await translateText(question.text, sourceLanguage, targetLanguage);
          const translatedOptions = await Promise.all(
            question.options.map(option => 
              translateText(option, sourceLanguage, targetLanguage)
            )
          );
          
          return {
            ...question,
            text: translatedText,
            options: translatedOptions
          };
        })
      );
      
      setTranslatedForm({
        ...originalForm,
        title: translatedTitle,
        description: translatedDescription,
        questions: translatedQuestions
      });
      
      setSuccess('Translation completed successfully!');
    } catch (err) {
      setError('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const exportTranslation = () => {
    if (!translatedForm) return;
    
    const exportData = {
      originalUrl: formUrl,
      sourceLanguage,
      targetLanguage,
      translatedForm
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated-form-${targetLanguage}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      <div className="max-width-container">
        {/* Header */}
        <div className="header">
          <div className="header-title">
            <Globe size={40} color="#4f46e5" />
            <h1>Google Form Translator</h1>
          </div>
          <p className="header-description">
            Paste any Google Form URL and translate it into multiple languages instantly. 
            Perfect for reaching global audiences.
          </p>
        </div>

        {/* URL Input Section */}
        <div className="card">
          <div className="section-header">
            <Link size={24} color="#4f46e5" />
            <h2>Enter Google Form URL</h2>
          </div>
          
          <div className="input-section">
            <input
              type="url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://docs.google.com/forms/d/your-form-id/viewform"
              className="url-input"
            />
            
            <div className="controls">
              <div className="language-select">
                <label>From:</label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="select"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="language-select">
                <label>To:</label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="select"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleExtractForm}
                disabled={isLoading}
                className={`btn btn-primary ${isLoading ? 'btn-loading' : ''}`}
              >
                <RefreshCw size={20} className={isLoading ? 'spin' : ''} />
                {isLoading ? 'Extracting...' : 'Extract Form'}
              </button>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="message message-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="message message-success">
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        )}

        {/* Form Content */}
        {originalForm && (
          <div className="form-grid">
            {/* Original Form */}
            <div className="card">
              <div className="form-header">
                <h2>Original Form</h2>
                <span className="language-badge language-badge-blue">
                  {languages.find(l => l.code === sourceLanguage)?.name}
                </span>
              </div>
              
              <div className="form-content">
                <div className="form-title-section">
                  <h3>{originalForm.title}</h3>
                  <p>{originalForm.description}</p>
                </div>
                
                <div className="questions-list">
                  {originalForm.questions.map((question, index) => (
                    <div key={question.id} className="question-card">
                      <div className="question-content">
                        <span className="question-number">Q{index + 1}</span>
                        <div className="question-details">
                          <p className="question-text">
                            {question.text}
                            {question.required && <span className="required">*</span>}
                          </p>
                          <p className="question-type">
                            {question.type.replace('-', ' ')}
                          </p>
                          {question.options.length > 0 && (
                            <div className="options-list">
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} className="option-item">
                                  <span className="bullet"></span>
                                  {option}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Translated Form */}
            <div className="card">
              <div className="form-header">
                <h2>Translated Form</h2>
                <div className="translate-controls">
                  <span className="language-badge language-badge-green">
                    {languages.find(l => l.code === targetLanguage)?.name}
                  </span>
                  <button
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className={`btn btn-success btn-small ${isTranslating ? 'btn-loading' : ''}`}
                  >
                    <RefreshCw size={16} className={isTranslating ? 'spin' : ''} />
                    {isTranslating ? 'Translating...' : 'Translate'}
                  </button>
                </div>
              </div>
              
              {translatedForm ? (
                <div className="form-content">
                  <div className="form-title-section">
                    <div className="copyable-content">
                      <h3>{translatedForm.title}</h3>
                      <button
                        onClick={() => copyToClipboard(translatedForm.title)}
                        className="copy-btn"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <div className="copyable-content">
                      <p>{translatedForm.description}</p>
                      <button
                        onClick={() => copyToClipboard(translatedForm.description)}
                        className="copy-btn"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="questions-list">
                    {translatedForm.questions.map((question, index) => (
                      <div key={question.id} className="question-card">
                        <div className="question-content">
                          <span className="question-number">Q{index + 1}</span>
                          <div className="question-details">
                            <div className="copyable-content">
                              <p className="question-text">
                                {question.text}
                                {question.required && <span className="required">*</span>}
                              </p>
                              <button
                                onClick={() => copyToClipboard(question.text)}
                                className="copy-btn"
                              >
                                <Copy size={16} />
                              </button>
                            </div>
                            <p className="question-type">
                              {question.type.replace('-', ' ')}
                            </p>
                            {question.options.length > 0 && (
                              <div className="options-list">
                                {question.options.map((option, optIndex) => (
                                  <div key={optIndex} className="option-item">
                                    <span className="bullet"></span>
                                    <span>{option}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={exportTranslation}
                    className="btn btn-export btn-full-width"
                  >
                    <Download size={20} />
                    Export Translation
                  </button>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-content">
                    <Globe size={64} className="empty-icon" />
                    <p>Click "Translate" to see the translated version</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}