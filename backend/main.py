from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
import re
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
from typing import Dict, List
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Google Form Translator", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model
tokenizer = None
model = None

class TranslateRequest(BaseModel):
    form_url: str
    target_language: str

class TranslateResponse(BaseModel):
    success: bool
    translated_form: Dict
    original_url: str
    target_language: str
    error: str = None

# Language mapping for NLLB model
LANGUAGE_CODES = {
    "spanish": "spa_Latn",
    "french": "fra_Latn",
    "german": "deu_Latn",
    "italian": "ita_Latn",
    "portuguese": "por_Latn",
    "russian": "rus_Cyrl",
    "chinese": "zho_Hans",
    "japanese": "jpn_Jpan",
    "korean": "kor_Hang",
    "arabic": "arb_Arab",
    "hindi": "hin_Deva",
    "english": "eng_Latn"
}

@app.on_event("startup")
async def load_model():
    """Load the NLLB model on startup"""
    global tokenizer, model
    try:
        logger.info("Loading NLLB model...")
        model_name = "facebook/nllb-200-distilled-600M"
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        logger.info("Model loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise e

def translate_text(text: str, target_lang: str, source_lang: str = "eng_Latn") -> str:
    """Translate text using NLLB model"""
    if not text or not text.strip():
        return text
    
    try:
        # Tokenize
        tokenizer.src_lang = source_lang
        encoded = tokenizer(text, return_tensors="pt", max_length=512, truncation=True)
        
        # Generate translation
        generated_tokens = model.generate(
            **encoded,
            forced_bos_token_id=tokenizer.lang_code_to_id[target_lang],
            max_length=512,
            num_beams=5,
            early_stopping=True
        )
        
        # Decode
        translated = tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)[0]
        return translated
    
    except Exception as e:
        logger.error(f"Translation error: {e}")
        return text  # Return original text if translation fails

def extract_form_data(html_content: str) -> Dict:
    """Extract form data from Google Form HTML"""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    form_data = {
        "title": "",
        "description": "",
        "questions": []
    }
    
    try:
        # Extract form title
        title_elem = soup.find('div', class_='freebirdFormviewerViewHeaderTitle')
        if title_elem:
            form_data["title"] = title_elem.get_text().strip()
        
        # Extract form description
        desc_elem = soup.find('div', class_='freebirdFormviewerViewHeaderDescription')
        if desc_elem:
            form_data["description"] = desc_elem.get_text().strip()
        
        # Extract questions
        question_divs = soup.find_all('div', class_='freebirdFormviewerViewItemsItemItem')
        
        for i, question_div in enumerate(question_divs):
            question_data = {
                "id": i + 1,
                "title": "",
                "description": "",
                "type": "text",
                "options": [],
                "required": False
            }
            
            # Question title
            title_elem = question_div.find('div', class_='freebirdFormviewerViewItemsItemItemTitle')
            if title_elem:
                question_data["title"] = title_elem.get_text().strip()
            
            # Question description
            desc_elem = question_div.find('div', class_='freebirdFormviewerViewItemsItemHelpText')
            if desc_elem:
                question_data["description"] = desc_elem.get_text().strip()
            
            # Check if required
            required_elem = question_div.find('span', class_='freebirdFormviewerViewItemsItemRequiredAsterisk')
            if required_elem:
                question_data["required"] = True
            
            # Extract options for multiple choice questions
            option_elems = question_div.find_all('span', class_='freebirdFormviewerViewItemsRadioChoice')
            if not option_elems:
                option_elems = question_div.find_all('span', class_='freebirdFormviewerViewItemsCheckboxChoice')
            
            for option_elem in option_elems:
                option_text = option_elem.get_text().strip()
                if option_text:
                    question_data["options"].append(option_text)
            
            # Determine question type
            if option_elems:
                if question_div.find('div', class_='freebirdFormviewerViewItemsRadioChoice'):
                    question_data["type"] = "radio"
                elif question_div.find('div', class_='freebirdFormviewerViewItemsCheckboxChoice'):
                    question_data["type"] = "checkbox"
            
            form_data["questions"].append(question_data)
    
    except Exception as e:
        logger.error(f"Error extracting form data: {e}")
    
    return form_data

def get_google_form_html(form_url: str) -> str:
    """Fetch Google Form HTML content"""
    try:
        # Convert Google Form edit URL to viewform URL if needed
        if '/edit' in form_url:
            form_url = form_url.replace('/edit', '/viewform')
        elif '/viewform' not in form_url:
            form_url += '/viewform'
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(form_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        return response.text
    
    except Exception as e:
        logger.error(f"Error fetching form: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch Google Form: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Google Form Translator API", "status": "running"}

@app.get("/languages")
async def get_supported_languages():
    """Get list of supported languages"""
    return {"languages": list(LANGUAGE_CODES.keys())}

@app.post("/translate", response_model=TranslateResponse)
async def translate_form(request: TranslateRequest):
    """Main endpoint to translate Google Forms"""
    try:
        # Validate target language
        target_lang_code = LANGUAGE_CODES.get(request.target_language.lower())
        if not target_lang_code:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported language: {request.target_language}"
            )
        
        # Fetch form HTML
        logger.info(f"Fetching form: {request.form_url}")
        html_content = get_google_form_html(request.form_url)
        
        # Extract form data
        logger.info("Extracting form data...")
        form_data = extract_form_data(html_content)
        
        # Translate form content
        logger.info(f"Translating to {request.target_language}...")
        translated_form = {
            "title": translate_text(form_data["title"], target_lang_code),
            "description": translate_text(form_data["description"], target_lang_code),
            "questions": []
        }
        
        for question in form_data["questions"]:
            translated_question = {
                "id": question["id"],
                "title": translate_text(question["title"], target_lang_code),
                "description": translate_text(question["description"], target_lang_code),
                "type": question["type"],
                "required": question["required"],
                "options": [translate_text(option, target_lang_code) for option in question["options"]]
            }
            translated_form["questions"].append(translated_question)
        
        return TranslateResponse(
            success=True,
            translated_form=translated_form,
            original_url=request.form_url,
            target_language=request.target_language
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Translation error: {e}")
        return TranslateResponse(
            success=False,
            translated_form={},
            original_url=request.form_url,
            target_language=request.target_language,
            error=str(e)
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
