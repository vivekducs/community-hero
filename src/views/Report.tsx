import { useState, useEffect, useRef, ChangeEvent, MouseEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../context/AuthContext';
import { useIssueStore } from '../store';
import { db } from '../firebaseConfig';
import { Issue, LatLng } from '../types';
import { apiFetch } from '../api';
import { openDB } from 'idb';
import { getFriendlyErrorMessage } from '../utils/errors';
import { 
  AlertTriangle, 
  MapPin, 
  Image as ImageIcon, 
  Camera, 
  Sparkles, 
  Loader2, 
  CheckCircle,
  Upload,
  RefreshCw,
  WifiOff,
  XCircle,
  EyeOff,
  Mic,
  MicOff,
  MessageSquare,
  Send,
  Volume2,
  Award,
  ShieldAlert,
  Wrench,
  Clock,
  BarChart3,
  Info,
  Layers,
  Globe,
  Languages,
  FileText,
  Activity,
  Check,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast, Toaster } from 'react-hot-toast';
import L from 'leaflet';

async function getDB() {
  return await openDB('citymind-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('issue-drafts')) {
        db.createObjectStore('issue-drafts', { keyPath: 'id', autoIncrement: true });
      }
    }
  });
}

// Fix for default marker icons in Leaflet with bundlers using public CDN
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CIVIC_CATEGORIES = [
  {
    name: 'Roads',
    department: 'Department of Transportation',
    subcategories: ['Pothole', 'Damaged Sidewalk', 'Road Blockage', 'Faded Road Markings']
  },
  {
    name: 'Water',
    department: 'Municipal Water & Sewage Board',
    subcategories: ['Water Leakage', 'Blocked Sewer', 'Open Manhole', 'Low Water Pressure']
  },
  {
    name: 'Electricity',
    department: 'Power & Streetlight Authority',
    subcategories: ['Broken Streetlight', 'Exposed Electrical Wires', 'Power Outage', 'Transformer Leak']
  },
  {
    name: 'Waste',
    department: 'Sanitation & Cleanliness Commission',
    subcategories: ['Illegal Garbage Dumping', 'Overflowing Public Bin', 'Debris Accumulation']
  },
  {
    name: 'Traffic',
    department: 'Metropolitan Traffic Control',
    subcategories: ['Traffic Light Malfunction', 'Congestion Hotspot', 'Illegal Parking']
  },
  {
    name: 'Healthcare',
    department: 'Municipal Health Services',
    subcategories: ['Medical Waste', 'Public Clinic Damage', 'Stray Animal Hazard']
  },
  {
    name: 'Education',
    department: 'Public Education Board',
    subcategories: ['School Zone Safety', 'Library Disrepair']
  }
];

const IMAGE_PRESETS = [
  { url: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=800&fit=crop', label: 'Pothole / Road' },
  { url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&fit=crop', label: 'Leak / Pipe' },
  { url: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&fit=crop', label: 'Lighting / Power' },
  { url: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=800&fit=crop', label: 'Garbage / Litter' }
];

const INDIAN_CITIES = [
  { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Kanpur', lat: 26.4499, lng: 80.3319 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 }
];

function MapController({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], 13);
  }, [center, map]);
  return null;
}

export default function Report() {
  const { user } = useAuth();
  const { addIssue } = useIssueStore();
  const navigate = useNavigate();

  const [selectedCity, setSelectedCity] = useState('Delhi');
  const [mapCenter, setMapCenter] = useState<LatLng>({ lat: 28.7041, lng: 77.1025 }); // Default to Delhi NCR
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  
  // Image handling options
  const [imageOption, setImageOption] = useState<'upload' | 'camera'>('upload');
  
  // Independent state variables for device uploads and camera captures
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string>('');
  
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string>('');

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // References for unmount cleanup
  const uploadedUrlRef = useRef<string>('');
  const capturedUrlRef = useRef<string>('');

  useEffect(() => {
    uploadedUrlRef.current = uploadedPreviewUrl;
  }, [uploadedPreviewUrl]);

  useEffect(() => {
    capturedUrlRef.current = capturedPreviewUrl;
  }, [capturedPreviewUrl]);

  useEffect(() => {
    return () => {
      if (uploadedUrlRef.current) {
        URL.revokeObjectURL(uploadedUrlRef.current);
      }
      if (capturedUrlRef.current) {
        URL.revokeObjectURL(capturedUrlRef.current);
      }
    };
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // New features state
  const [rightActiveTab, setRightActiveTab] = useState<'map' | 'copilot'>('map');
  const [copilotLanguage, setCopilotLanguage] = useState<'en' | 'hi'>('en');
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: 'model', text: "Namaste! I am your CityMind Citizen Copilot. Speak or type in English or Hindi, and I will help you file a perfect civic report! Kya samasya hai?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isListeningChat, setIsListeningChat] = useState(false);

  const [fullAnalysis, setFullAnalysis] = useState<any | null>(null);

  const [voiceReportLang, setVoiceReportLang] = useState<'en' | 'hi'>('en');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [isListeningVoiceReport, setIsListeningVoiceReport] = useState(false);
  const [voiceParsedData, setVoiceParsedData] = useState<any | null>(null);
  
  const [aiSuggestions, setAiSuggestions] = useState<{
    category: string;
    subcategory: string;
    department: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    loading: boolean;
  }>({
    category: '',
    subcategory: '',
    department: '',
    severity: 'medium',
    confidence: 0,
    loading: false
  });

  const [imageAnalysis, setImageAnalysis] = useState<{
    loading: boolean;
    analyzed: boolean;
    isValid: boolean;
    isClear: boolean;
    issueVisible: boolean;
    feedback: string;
    flaggedStatus: 'none' | 'clean_no_issue' | 'irrelevant_home_image' | 'blurry';
  }>({
    loading: false,
    analyzed: false,
    isValid: true,
    isClear: true,
    issueVisible: true,
    feedback: '',
    flaggedStatus: 'none'
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const hasAutoDetected = useRef(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      description: '',
      category: '',
      subcategory: '',
      severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
      latitude: '',
      longitude: ''
    }
  });

  const watchedCategory = watch('category');
  const watchedTitle = watch('title');
  const watchedDescription = watch('description');

  // Speech Recognition State
  const [isListeningTitle, setIsListeningTitle] = useState(false);
  const [isListeningDesc, setIsListeningDesc] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = (field: 'title' | 'description') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Web Speech API is not supported in this browser. Try Chrome, Safari, or Edge.", { id: 'speech-toast' });
      return;
    }

    if ((field === 'title' && isListeningTitle) || (field === 'description' && isListeningDesc)) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        if (field === 'title') {
          setIsListeningTitle(true);
          setIsListeningDesc(false);
        } else {
          setIsListeningDesc(true);
          setIsListeningTitle(false);
        }
        toast.success(`Listening... Speak into your microphone`, { id: 'speech-toast', duration: 4000 });
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          toast.error("Microphone permission denied. Please enable microphone access.", { id: 'speech-toast' });
        } else {
          toast.error(`Speech recognition error: ${event.error}`, { id: 'speech-toast' });
        }
        setIsListeningTitle(false);
        setIsListeningDesc(false);
      };

      rec.onend = () => {
        setIsListeningTitle(false);
        setIsListeningDesc(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const currentVal = field === 'title' ? watchedTitle : watchedDescription;
          const newVal = currentVal ? `${currentVal.trim()} ${transcript}` : transcript;
          setValue(field, newVal);
          toast.success("Transcribed successfully!", { id: 'speech-toast' });
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error("Failed to start speech recognition", err);
      toast.error("Failed to start microphone listener.", { id: 'speech-toast' });
    }
  };

  /**
   * Speech Recognition for AI Copilot Chat (Feature 1, 9)
   */
  const toggleListeningChat = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Web Speech API not supported.");
      return;
    }

    if (isListeningChat) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = copilotLanguage === 'hi' ? 'hi-IN' : 'en-US';

      rec.onstart = () => {
        setIsListeningChat(true);
        toast.success(`Listening (${copilotLanguage === 'hi' ? 'Hindi' : 'English'})... Speak now`, { id: 'chat-speech' });
      };

      rec.onerror = (e: any) => {
        console.error("Chat Speech Error:", e);
        toast.error("Failed to capture speech.");
        setIsListeningChat(false);
      };

      rec.onend = () => {
        setIsListeningChat(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setChatInput(transcript);
          toast.success("Transcribed! Press Send.", { id: 'chat-speech' });
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error(err);
      toast.error("Microphone initialization failed.");
    }
  };

  /**
   * Send Message to AI Citizen Copilot (Feature 1, 9)
   */
  const sendCopilotMessage = async (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;

    const userMsg = { role: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      // Build history for backend
      const historyPayload = chatMessages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await apiFetch('/api/gemini/copilot-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: 'model', text: data.reply }]);

        // Auto-populate form if extracted details exist
        if (data.extractedDetails) {
          const details = data.extractedDetails;
          let filledAny = false;

          if (details.title) {
            setValue('title', details.title);
            filledAny = true;
          }
          if (details.description) {
            setValue('description', details.description);
            filledAny = true;
          }
          if (details.category) {
            setValue('category', details.category);
            filledAny = true;
          }
          if (details.subcategory) {
            setValue('subcategory', details.subcategory);
            filledAny = true;
          }
          if (details.severity) {
            setValue('severity', details.severity);
            filledAny = true;
          }

          if (filledAny) {
            toast.success("Copilot automatically updated the report form fields!", { icon: '🤖' });
          }
        }
      } else {
        throw new Error("Chat failed");
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'model', text: "Excuse me, I faced a minor connection error. Let's try again, or you can fill in the form fields directly!" }]);
    } finally {
      setChatLoading(false);
    }
  };

  /**
   * Speech Recognition for Voice Reporting Widget (Feature 2, 9)
   */
  const toggleListeningVoiceReport = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Web Speech API not supported.");
      return;
    }

    if (isListeningVoiceReport) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = voiceReportLang === 'hi' ? 'hi-IN' : 'en-US';

      rec.onstart = () => {
        setIsListeningVoiceReport(true);
        setVoiceTranscript('');
        toast.success(`Voice Reporting is active (${voiceReportLang === 'hi' ? 'Hindi' : 'English'}). Speak your issue...`, { id: 'voice-widget' });
      };

      rec.onerror = (e: any) => {
        console.error("Voice Widget Speech Error:", e);
        toast.error("Mic error.");
        setIsListeningVoiceReport(false);
      };

      rec.onend = () => {
        setIsListeningVoiceReport(false);
      };

      rec.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setVoiceTranscript(transcript);
          toast.success("Speech captured! Parsing details...", { id: 'voice-widget' });
          await parseVoiceTranscript(transcript);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Parse Voice Transcript to Structured Data (Feature 2)
   */
  const parseVoiceTranscript = async (transcript: string) => {
    setVoiceParsing(true);
    try {
      const response = await apiFetch('/api/gemini/voice-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript })
      });

      if (response.ok) {
        const data = await response.json();
        setVoiceParsedData(data);
        toast.success("Speech parsed into structured fields! Review them below.", { id: 'voice-widget' });
      } else {
        throw new Error();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse voice transcript automatically.", { id: 'voice-widget' });
    } finally {
      setVoiceParsing(false);
    }
  };

  /**
   * Apply Voice Parsed Data to Form (Feature 2)
   */
  const applyVoiceParsedData = () => {
    if (!voiceParsedData) return;

    if (voiceParsedData.title) setValue('title', voiceParsedData.title);
    if (voiceParsedData.description) setValue('description', voiceParsedData.description);
    if (voiceParsedData.category) setValue('category', voiceParsedData.category);
    if (voiceParsedData.subcategory) setValue('subcategory', voiceParsedData.subcategory);
    if (voiceParsedData.severity) setValue('severity', voiceParsedData.severity);

    toast.success("Applied! Your form has been fully pre-populated.", { icon: '📝' });
    setVoiceParsedData(null);
    setVoiceTranscript('');
  };

  // Trigger GPS auto-detect
  const handleGPSDetect = (isInitial: boolean = false) => {
    if (isInitial) {
      if (hasAutoDetected.current) return;
      hasAutoDetected.current = true;
    }

    if (!navigator.geolocation) {
      if (!isInitial) {
        toast.error("Geolocation is not supported by your browser.");
      }
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setMapCenter(coords);
        setSelectedLocation(coords);
        setValue('latitude', coords.lat.toFixed(6));
        setValue('longitude', coords.lng.toFixed(6));
        setGpsLoading(false);
        toast.success("GPS Location auto-detected!");
      },
      (error) => {
        console.error("GPS error:", error);
        if (!isInitial) {
          toast.error("Could not obtain GPS permission or accuracy.");
        }
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Run GPS auto detect on initial mount
  useEffect(() => {
    handleGPSDetect(true);

    // Setup offline draft sync
    const syncOfflineDrafts = async () => {
      try {
        const dbLocal = await getDB();
        const drafts = await dbLocal.getAll('issue-drafts');
        if (drafts.length > 0) {
          toast.loading(`Syncing ${drafts.length} offline drafts...`, { id: 'sync' });
          for (const draft of drafts) {
            await apiFetch('/api/issues', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(draft.payload)
            });
            await dbLocal.delete('issue-drafts', draft.id);
          }
          toast.success("Offline drafts synced successfully!", { id: 'sync' });
        }
      } catch (err) {
        console.error("Sync failed:", err);
      }
    };

    window.addEventListener('online', syncOfflineDrafts);
    return () => window.removeEventListener('online', syncOfflineDrafts);
  }, [setValue]);

  // Update map and form when selected city changes
  useEffect(() => {
    const city = INDIAN_CITIES.find(c => c.name === selectedCity);
    if (city) {
      const coords = { lat: city.lat, lng: city.lng };
      setMapCenter(coords);
      setSelectedLocation(coords);
      setValue('latitude', coords.lat.toFixed(6));
      setValue('longitude', coords.lng.toFixed(6));
    }
  }, [selectedCity, setValue]);

  // Set subcategories when category changes
  const activeCategoryObj = CIVIC_CATEGORIES.find(c => c.name === watchedCategory);
  const currentSubcategories = activeCategoryObj ? activeCategoryObj.subcategories : [];

  // Map clicks
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        const coords = { lat: e.latlng.lat, lng: e.latlng.lng };
        setSelectedLocation(coords);
        setValue('latitude', coords.lat.toFixed(6));
        setValue('longitude', coords.lng.toFixed(6));
        toast.success("Location pin dropped!");
      }
    });
    return null;
  }

  // Text & Image AI Analysis trigger
  const handleAiAnalysis = async () => {
    if (!watchedTitle || watchedTitle.length < 10) {
      toast.error("Please enter a title (minimum 10 chars) first for AI Analysis!");
      return;
    }

    setAiSuggestions(prev => ({ ...prev, loading: true }));
    setImageAnalysis(prev => ({ ...prev, loading: true, analyzed: false }));
    setFullAnalysis(null);

    try {
      let base64Image: string | undefined = undefined;
      const fileToAnalyze = imageOption === 'upload' ? uploadedFile : (imageOption === 'camera' ? capturedFile : null);
      if (fileToAnalyze) {
        base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(fileToAnalyze);
        });
      }

      const response = await apiFetch('/api/gemini/analyze-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: watchedTitle, 
          description: watchedDescription || "No detailed description provided.",
          image: base64Image,
          latitude: selectedLocation?.lat,
          longitude: selectedLocation?.lng
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store full analysis
        setFullAnalysis(data);

        // Keep backwards compatible state synchronized
        setAiSuggestions({
          category: data.category || 'Roads',
          subcategory: data.subcategory || 'Pothole',
          department: data.department || 'Department of Transportation',
          severity: data.severity || 'medium',
          confidence: data.confidence || 92,
          loading: false
        });

        if (data.vision) {
          setImageAnalysis({
            loading: false,
            analyzed: true,
            isValid: data.vision.issueVisible,
            isClear: data.vision.clarified,
            issueVisible: data.vision.issueVisible,
            feedback: data.vision.qualityFeedback || '',
            flaggedStatus: data.vision.issueVisible ? 'none' : 'clean_no_issue'
          });
        } else {
          setImageAnalysis({
            loading: false,
            analyzed: false,
            isValid: true,
            isClear: true,
            issueVisible: true,
            feedback: '',
            flaggedStatus: 'none'
          });
        }

        // Autofill form
        setValue('category', data.category || 'Roads');
        setValue('subcategory', data.subcategory || 'Pothole');
        setValue('severity', data.severity || 'medium');
        
        toast.success(`Agentic Multi-Agent Triage complete! Match: ${data.category} (${data.confidence}% confidence)`);
      } else {
        throw new Error();
      }
    } catch (err) {
      console.error(err);
      toast.error("AI Insights server busy. Fallback prediction applied.");
      setImageAnalysis({
        loading: false,
        analyzed: false,
        isValid: true,
        isClear: true,
        issueVisible: true,
        feedback: '',
        flaggedStatus: 'none'
      });
      
      // Local fallback parser
      const text = (watchedTitle + ' ' + watchedDescription).toLowerCase();
      let cat = 'Roads';
      let sub = 'Pothole';
      let dept = 'Department of Transportation';
      let sev: 'low' | 'medium' | 'high' | 'critical' = 'medium';

      if (text.includes('leak') || text.includes('water') || text.includes('sewer') || text.includes('pipe')) {
        cat = 'Water';
        sub = 'Water Leakage';
        dept = 'Municipal Water & Sewage Board';
        sev = 'high';
      } else if (text.includes('light') || text.includes('power') || text.includes('electric') || text.includes('wire')) {
        cat = 'Electricity';
        sub = text.includes('wire') ? 'Exposed Electrical Wires' : 'Broken Streetlight';
        dept = 'Power & Streetlight Authority';
        sev = text.includes('wire') ? 'critical' : 'medium';
      } else if (text.includes('trash') || text.includes('garbage') || text.includes('dump') || text.includes('litter') || text.includes('bin') || text.includes('waste')) {
        cat = 'Waste';
        sub = text.includes('dump') ? 'Illegal Garbage Dumping' : 'Overflowing Public Bin';
        dept = 'Sanitation & Cleanliness Commission';
        sev = 'low';
      } else if (text.includes('traffic') || text.includes('parking') || text.includes('jam') || text.includes('congestion')) {
        cat = 'Traffic';
        sub = 'Congestion Hotspot';
        dept = 'Metropolitan Traffic Control';
        sev = 'medium';
      }

      setAiSuggestions({
        category: cat,
        subcategory: sub,
        department: dept,
        severity: sev,
        confidence: 85,
        loading: false
      });

      setValue('category', cat);
      setValue('subcategory', sub);
      setValue('severity', sev);
    }
  };

  const handleUploadFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      if (uploadedPreviewUrl) {
        URL.revokeObjectURL(uploadedPreviewUrl);
      }
      setUploadedPreviewUrl(URL.createObjectURL(file));
      toast.success("Device image selected!");
    }
  };

  const handleCameraFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCapturedFile(file);
      if (capturedPreviewUrl) {
        URL.revokeObjectURL(capturedPreviewUrl);
      }
      setCapturedPreviewUrl(URL.createObjectURL(file));
      toast.success("Camera photo captured!");
    }
  };

  const clearUploadedFile = (e: MouseEvent) => {
    e.stopPropagation();
    setUploadedFile(null);
    if (uploadedPreviewUrl) {
      URL.revokeObjectURL(uploadedPreviewUrl);
      setUploadedPreviewUrl('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success("Uploaded image cleared");
  };

  const clearCapturedFile = (e: MouseEvent) => {
    e.stopPropagation();
    setCapturedFile(null);
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
      setCapturedPreviewUrl('');
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
    toast.success("Captured photo cleared");
  };

  const uploadToStorage = async (file: File | Blob | string, issueId: string): Promise<string> => {
    try {
      let fileToUpload: File | Blob;
      
      // Handle native paths or string URIs
      if (typeof file === 'string') {
        const res = await fetch(file);
        fileToUpload = await res.blob();
      } else {
        fileToUpload = file;
      }

      toast.loading("Compressing image for submission...", { id: 'upload-toast' });
      setUploadProgress(15);
      
      // Compress image client-side before upload
      const options = {
        maxSizeMB: 0.1, // Target small size (100KB)
        maxWidthOrHeight: 800,
        useWebWorker: true,
        initialQuality: 0.6
      };
      
      let compressedFile: Blob;
      try {
        compressedFile = await imageCompression(fileToUpload as File, options);
      } catch (compErr) {
        console.warn("Image compression failed, using original file:", compErr);
        compressedFile = fileToUpload;
      }

      setUploadProgress(45);
      toast.loading("Uploading image to secure server...", { id: 'upload-toast' });

      // Convert to base64
      const base64Str = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(compressedFile);
      });

      setUploadProgress(75);

      // Post to local server upload endpoint
      const uploadResponse = await apiFetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Str })
      });

      if (!uploadResponse.ok) {
        throw new Error("Local server upload failed");
      }

      const uploadResult = await uploadResponse.json();
      setUploadProgress(100);
      toast.success("Image uploaded successfully!", { id: 'upload-toast' });
      
      return uploadResult.url;
    } catch (err: any) {
      console.error("Upload process failed:", err);
      toast.error("Upload failed: " + getFriendlyErrorMessage(err), { id: 'upload-toast' });
      throw err;
    }
  };

  const onSubmit = async (data: any) => {
    if (!selectedLocation) {
      toast.error("Please drop a pin on the map or click GPS Detect.");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to report issues.");
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    const issue_id = 'issue_' + Math.random().toString(36).substr(2, 9);
    let finalImageUrl = '';

    try {
      // 1. Upload custom image if chosen
      const fileToUpload = imageOption === 'upload' ? uploadedFile : (imageOption === 'camera' ? capturedFile : null);
      
      if (!fileToUpload) {
        toast.error(imageOption === 'upload' ? "Please select an image file to upload." : "Please capture a photo using your camera.");
        setIsSubmitting(false);
        return;
      }
      toast.loading("Uploading proof image to Cloud Storage...", { id: 'upload-toast' });
      finalImageUrl = await uploadToStorage(fileToUpload, issue_id);
      toast.success("Image uploaded successfully!", { id: 'upload-toast' });

      const departmentName = CIVIC_CATEGORIES.find(c => c.name === data.category)?.department || 'General Administration';

      const payload = {
        title: data.title,
        description: data.description,
        image_url: finalImageUrl,
        location: selectedLocation,
        severity: data.severity,
        created_by: user.user_id,
        created_by_name: user.name,
        category: data.category,
        subcategory: data.subcategory
      };

      if (!navigator.onLine) {
        const dbLocal = await getDB();
        await dbLocal.put('issue-drafts', {
          payload,
          created_at: Date.now()
        });
        toast.success("Saved as offline draft. Will sync when reconnected.", { id: 'upload-toast', duration: 4000 });
        setTimeout(() => navigate('/dashboard'), 2000);
        setIsSubmitting(false);
        return;
      }

      // 2. Post to backend
      const response = await apiFetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to persist issue to database");
      }

      const createdIssue = await response.json();
      
      // Update local Zustand store
      addIssue(createdIssue as Issue);

      // Create an AI-powered smart notification (Feature 10)
      try {
        const notifId = 'notif_' + Math.random().toString(36).substr(2, 9);
        const expectedResponse = fullAnalysis?.suggestions?.expectedResponseTime || '4 hours';
        const expectedRepair = fullAnalysis?.suggestions?.estimatedRepairTime || '48 hours';
        
        await setDoc(doc(db, 'notifications', notifId), {
          notification_id: notifId,
          issue_id: createdIssue.issue_id,
          user_id: user.user_id,
          message: `🤖 [AI Dispatcher]: Incident "${createdIssue.title}" assigned to ${createdIssue.department || departmentName}. Resolution expected within ${expectedRepair} (Dispatch SLA: ${expectedResponse}).`,
          is_read: false,
          created_at: new Date().toISOString()
        });
      } catch (notifErr) {
        console.warn("Failed to create AI notification:", notifErr);
      }

      if (createdIssue.status === 'auto_discarded') {
        toast.error(`Auto-Filtered: ${createdIssue.image_feedback || 'Irrelevant photo detected.'}`, { duration: 8000 });
        toast("Your report was auto-discarded because the photo was verified as invalid (such as an indoor home or clean surface). Report it again with a correct photo.", { icon: '⚠️', duration: 8000 });
        setTimeout(() => {
          navigate('/dashboard');
        }, 5000);
        return;
      }

      // Trigger success notifications and redirect
      toast.success("Issue reported! Redispatching local sentinel...", { duration: 3000 });
      
      // Display Gemini classification insight
      setTimeout(() => {
        toast(`Categorized under ${createdIssue.category} (${createdIssue.confidence}% confidence)`, {
          icon: '🤖',
          duration: 3000
        });
      }, 1000);

      // Wait 2 seconds and redirect to new issue detail
      setTimeout(() => {
        navigate(`/issues/${createdIssue.issue_id}`);
      }, 2000);

    } catch (err: any) {
      console.error(err);
      toast.error(getFriendlyErrorMessage(err), { id: 'upload-toast' });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="space-y-8" id="report-view-container">
      <Toaster position="top-right" />

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Report a Civic Incident</h1>
        <p className="text-slate-500 max-w-2xl text-sm">Upload visual proof, pinpoint the location, and let our Gemini AI dispatcher forward your report to the optimal public service department.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form Panel */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" id="report-issue-form">
            
            {/* Multi-language Voice Reporting Widget (Feature 2, 9) */}
            <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-saffron/10 rounded-xl border border-saffron/20">
                    <Mic className="w-5 h-5 text-saffron" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold tracking-tight">🗣️ Dynamic Voice Reporting</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Hindi & English Speech-to-Text Incident Dispatcher</p>
                  </div>
                </div>

                {/* Language Selector (Feature 9) */}
                <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setVoiceReportLang('en')}
                    className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition-colors ${
                      voiceReportLang === 'en' ? 'bg-navy text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceReportLang('hi')}
                    className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition-colors ${
                      voiceReportLang === 'hi' ? 'bg-saffron text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    हिंदी
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Speak your issue in details (e.g. "हमारे यहाँ कानपुर में मुख्य सड़क पर बहुत बड़ा गड्ढा है जिससे गाड़ियां फिसल रही हैं").
                CityMind will automatically parse it and draft structured report details.
              </p>

              {/* Action Mic Row */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleListeningVoiceReport}
                  className={`flex-1 h-12 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all duration-150 cursor-pointer ${
                    isListeningVoiceReport
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                      : 'bg-saffron hover:bg-saffron/90 text-slate-950'
                  }`}
                >
                  {isListeningVoiceReport ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      Listening to Speech... (Tap to stop)
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-slate-950" />
                      Start Speaking
                    </>
                  )}
                </button>
              </div>

              {/* Transcript Display */}
              {voiceTranscript && (
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 text-xs text-slate-200 font-medium">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide mb-1">What we heard:</span>
                  "{voiceTranscript}"
                </div>
              )}

              {/* Parsing Loader */}
              {voiceParsing && (
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-saffron shrink-0" />
                  <span>CityMind AI Agent is parsing your speech into structured report fields...</span>
                </div>
              )}

              {/* Parsed Fields Preview & Edit (Feature 2) */}
              {voiceParsedData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-saffron">Parsed Draft Details Preview</span>
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">Review Fields</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Title</span>
                      <input
                        type="text"
                        value={voiceParsedData.title || ''}
                        onChange={(e) => setVoiceParsedData({ ...voiceParsedData, title: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white font-medium focus:outline-none focus:border-saffron text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Description</span>
                      <textarea
                        value={voiceParsedData.description || ''}
                        onChange={(e) => setVoiceParsedData({ ...voiceParsedData, description: e.target.value })}
                        rows={2}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white font-medium focus:outline-none focus:border-saffron text-xs resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Category</span>
                        <input
                          type="text"
                          value={voiceParsedData.category || ''}
                          onChange={(e) => setVoiceParsedData({ ...voiceParsedData, category: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white font-medium focus:outline-none focus:border-saffron text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Subcategory</span>
                        <input
                          type="text"
                          value={voiceParsedData.subcategory || ''}
                          onChange={(e) => setVoiceParsedData({ ...voiceParsedData, subcategory: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white font-medium focus:outline-none focus:border-saffron text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Severity</span>
                        <select
                          value={voiceParsedData.severity || 'medium'}
                          onChange={(e) => setVoiceParsedData({ ...voiceParsedData, severity: e.target.value })}
                          className="w-full h-8 bg-slate-800 border border-slate-700 rounded px-1.5 text-white font-medium focus:outline-none focus:border-saffron text-xs cursor-pointer"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Agency</span>
                        <div className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-slate-400 font-mono text-[10px] truncate">
                          {voiceParsedData.department || 'General Administration'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={applyVoiceParsedData}
                    className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Apply Fields & Auto-fill Form
                  </button>
                </motion.div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Incident Title *</label>
              <div className="relative">
                <input
                  type="text"
                  {...register('title', { 
                    required: 'Title is required', 
                    minLength: { value: 10, message: 'Minimum 10 characters required' } 
                  })}
                  placeholder="e.g. Broken water pipeline flooding main lane"
                  className="w-full h-11 pl-4 pr-12 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-navy/10 focus:border-navy focus:outline-none transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => toggleListening('title')}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-150 cursor-pointer ${
                    isListeningTitle 
                      ? 'bg-red-500 text-white animate-pulse shadow-md hover:bg-red-600' 
                      : 'text-slate-400 hover:text-navy hover:bg-slate-100'
                  }`}
                  title={isListeningTitle ? "Stop Listening" : "Dictate Title"}
                >
                  {isListeningTitle ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
              {errors.title && <span className="text-xs font-medium text-red-600">{errors.title.message}</span>}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Incident Details (Optional)</label>
              <div className="relative">
                <textarea
                  rows={4}
                  {...register('description')}
                  placeholder="Include size, duration, or any potential road hazards to assist responding public service units..."
                  className="w-full pt-4 pb-4 pl-4 pr-12 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-navy/10 focus:border-navy focus:outline-none transition-all duration-150 resize-none"
                ></textarea>
                <button
                  type="button"
                  onClick={() => toggleListening('description')}
                  className={`absolute right-2.5 top-3 p-2 rounded-lg transition-all duration-150 cursor-pointer ${
                    isListeningDesc 
                      ? 'bg-red-500 text-white animate-pulse shadow-md hover:bg-red-600' 
                      : 'text-slate-400 hover:text-navy hover:bg-slate-100'
                  }`}
                  title={isListeningDesc ? "Stop Listening" : "Dictate Details"}
                >
                  {isListeningDesc ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* AI Assistant Button */}
            <div className="p-4 bg-navy/5 rounded-2xl border border-navy/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-navy font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-saffron" />
                  AI Classifier & Dispatcher
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">Gemini AI will automatically predict the category, optimal responding department, and initial severity level based on your text inputs.</p>
              </div>
              <button
                type="button"
                id="btn-ai-analysis"
                onClick={handleAiAnalysis}
                disabled={aiSuggestions.loading}
                className="px-4 py-2 bg-navy hover:bg-navy-hover text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md transition-colors duration-150 self-start sm:self-center cursor-pointer disabled:bg-slate-300"
              >
                {aiSuggestions.loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Predict Details
                  </>
                )}
              </button>
            </div>

            {/* AI Success Feedback */}
            {aiSuggestions.category && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: [0.9, 1.03, 1] }}
                transition={{
                  default: { type: 'spring', stiffness: 300, damping: 18 },
                  scale: { type: 'tween', ease: 'easeOut', duration: 0.3 }
                }}
                className="p-4 bg-accent-green/5 border border-accent-green/20 rounded-xl flex items-start gap-3"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -25 }}
                  animate={{ scale: [0, 1.35, 1], rotate: 0 }}
                  transition={{
                    default: { type: 'spring', stiffness: 450, damping: 12, delay: 0.15 },
                    scale: { type: 'tween', ease: 'easeOut', duration: 0.4, delay: 0.15 }
                  }}
                  className="shrink-0 mt-0.5"
                >
                  <CheckCircle className="w-5 h-5 text-accent-green" />
                </motion.div>
                <div className="text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-accent-green">AI Triage Classification Match ({aiSuggestions.confidence}% Confidence)</p>
                  <p>Estimated Responding Agency: <span className="font-semibold text-navy">{aiSuggestions.department}</span></p>
                  <p>Predicted Category: <span className="font-semibold text-navy">{aiSuggestions.category} &gt; {aiSuggestions.subcategory}</span></p>
                </div>
              </motion.div>
            )}

            {/* CityMind Smart Reporting Center (Features 3, 4, 5, 6, 7, 8, 11) */}
            {fullAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6"
              >
                {/* Header & Confidence Meter (Feature 5) */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <Activity className="w-4 h-4 text-navy" />
                      AI Intelligence Dashboard
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">Real-time transacted report analysis powered by CityMind Agents.</p>
                  </div>

                  {/* Confidence meter */}
                  <div className="flex items-center gap-2.5 bg-white py-1.5 px-3 rounded-xl border border-slate-200">
                    <div className="relative flex items-center justify-center w-9 h-9">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="18" cy="18" r="15" stroke="#f1f5f9" strokeWidth="3" fill="transparent" />
                        <circle 
                          cx="18" cy="18" r="15" 
                          stroke={fullAnalysis.confidence >= 90 ? '#10b981' : '#f59e0b'} 
                          strokeWidth="3" 
                          fill="transparent" 
                          strokeDasharray={94} 
                          strokeDashoffset={94 - (94 * (fullAnalysis.confidence || 90)) / 100} 
                        />
                      </svg>
                      <span className="absolute text-[10px] font-extrabold text-slate-700">{fullAnalysis.confidence}%</span>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Confidence Meter</p>
                      <p className="text-xs font-extrabold text-slate-700">
                        {fullAnalysis.confidence >= 90 ? 'High' : 'Moderate'} Trust
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reasoning Timeline (Explainability, Feature 11) */}
                <div className="space-y-3">
                  <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-navy" />
                    Multi-Agent Decision Timeline
                  </h5>
                  <div className="relative pl-4 border-l-2 border-slate-200 ml-2.5 space-y-4">
                    {fullAnalysis.explainability?.steps?.map((step: any, sIdx: number) => (
                      <div key={step.id || sIdx} className="relative">
                        {/* Dot */}
                        <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-white border-2 border-navy flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-saffron" />
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-800">{step.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                                {step.durationMs}ms
                              </span>
                              <span className="text-[10px] text-emerald-600 font-extrabold">
                                {step.confidence}%
                              </span>
                            </div>
                          </div>
                          <p className="text-slate-600 font-medium leading-relaxed">{step.reasoning}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vision AI & OCR (Features 3, 4) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vision Diagnostics */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <ImageIcon className="w-4 h-4 text-navy" />
                      Vision AI Diagnostics
                    </div>
                    {fullAnalysis.vision ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[11px] border-b border-slate-100 pb-1.5">
                          <span className="text-slate-500 font-medium">Issue Visible:</span>
                          <span className={`font-bold px-1.5 py-0.5 rounded ${fullAnalysis.vision.issueVisible ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {fullAnalysis.vision.issueVisible ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] border-b border-slate-100 pb-1.5">
                          <span className="text-slate-500 font-medium">Image Clear:</span>
                          <span className={`font-bold px-1.5 py-0.5 rounded ${fullAnalysis.vision.clarified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {fullAnalysis.vision.clarified ? 'Clear' : 'Low Clarity'}
                          </span>
                        </div>

                        {/* Detected Issues */}
                        {fullAnalysis.vision.detectedIssues?.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Detected Incidents:</span>
                            <div className="flex flex-wrap gap-1">
                              {fullAnalysis.vision.detectedIssues.map((issue: string, idx: number) => (
                                <span key={idx} className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px]">
                                  {issue}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Hazards */}
                        {fullAnalysis.vision.hazards?.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide block flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> Public Hazards:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {fullAnalysis.vision.hazards.map((hazard: string, idx: number) => (
                                <span key={idx} className="bg-red-50 text-red-700 font-semibold px-2 py-0.5 rounded text-[10px] border border-red-100">
                                  {hazard}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No image submitted for diagnostics.</p>
                    )}
                  </div>

                  {/* OCR Label Extraction */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <FileText className="w-4 h-4 text-navy" />
                      OCR Label Scanning
                    </div>
                    {fullAnalysis.ocr ? (
                      <div className="space-y-2.5 text-xs">
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 font-mono text-[10px] text-slate-600">
                          {fullAnalysis.ocr.extractedText ? `"${fullAnalysis.ocr.extractedText}"` : '"No texts detected"'}
                        </div>

                        {fullAnalysis.ocr.streetName && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="text-slate-500 font-medium">Street Match:</span>
                            <span className="font-bold text-navy flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" /> {fullAnalysis.ocr.streetName}
                            </span>
                          </div>
                        )}

                        {fullAnalysis.ocr.utilityLabels?.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Utility/Agency Seals:</span>
                            <div className="flex flex-wrap gap-1">
                              {fullAnalysis.ocr.utilityLabels.map((tag: string, idx: number) => (
                                <span key={idx} className="bg-amber-50 text-amber-800 border border-amber-100 font-semibold px-2 py-0.5 rounded text-[10px]">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {fullAnalysis.ocr.improvementApplied && (
                          <div className="p-2 bg-emerald-50 text-emerald-800 rounded text-[10px] border border-emerald-100">
                            <strong>OCR Adjustment:</strong> {fullAnalysis.ocr.improvementDetails}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">OCR context scanner inactive.</p>
                    )}
                  </div>
                </div>

                {/* Report Quality Assessment (Feature 6) */}
                {fullAnalysis.quality && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-navy" />
                        AI Quality Assurance Audit
                      </span>
                      <span className="text-[11px] bg-navy text-white px-2 py-0.5 rounded-full">
                        Overall Score: {fullAnalysis.quality.overallScore}/100
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">
                          <span>Photo Quality</span>
                          <span>{fullAnalysis.quality.imageScore}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full" style={{ width: `${fullAnalysis.quality.imageScore}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">
                          <span>Description Quality</span>
                          <span>{fullAnalysis.quality.descriptionScore}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full" style={{ width: `${fullAnalysis.quality.descriptionScore}%` }} />
                        </div>
                      </div>
                    </div>

                    {fullAnalysis.quality.suggestions?.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Actionable Suggestions:</span>
                        <ul className="text-xs text-slate-600 font-medium space-y-1 list-disc list-inside">
                          {fullAnalysis.quality.suggestions.map((sug: string, idx: number) => (
                            <li key={idx} className="leading-relaxed">{sug}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Repair Recommendations (Feature 7) */}
                {fullAnalysis.suggestions && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
                      <Wrench className="w-4 h-4 text-navy" />
                      AI SLA Estimates & Recommendations
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-50 p-3 rounded-lg text-center space-y-1 border border-slate-100">
                        <Clock className="w-4 h-4 text-indigo-500 mx-auto" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Repair SLA</span>
                        <span className="font-extrabold text-slate-800">{fullAnalysis.suggestions.estimatedRepairTime || '48 Hours'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg text-center space-y-1 border border-slate-100">
                        <ShieldAlert className="w-4 h-4 text-amber-500 mx-auto" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Dispatch SLA</span>
                        <span className="font-extrabold text-slate-800">{fullAnalysis.suggestions.expectedResponseTime || 'Within 4 Hours'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg text-center space-y-1 border border-slate-100">
                        <Layers className="w-4 h-4 text-emerald-500 mx-auto" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Nearby Duplicates</span>
                        <span className="font-extrabold text-slate-800">{fullAnalysis.suggestions.similarIssuesCount || 0} Found</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Municipal Executive Summary (Feature 8) */}
                {fullAnalysis.summary && (
                  <div className="bg-navy/5 p-4 rounded-xl border border-navy/10 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
                      <FileText className="w-4 h-4 text-saffron" />
                      Municipal Executive Summary
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-semibold italic bg-white p-3 rounded-lg border border-slate-150 shadow-inner">
                      "{fullAnalysis.summary}"
                    </p>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(fullAnalysis.summary);
                          toast.success("Executive summary copied to clipboard!");
                        }}
                        className="text-[10px] font-extrabold text-navy hover:underline flex items-center gap-0.5 ml-auto cursor-pointer"
                      >
                        Copy Summary
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Category and Subcategory Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Category *</label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="w-full h-11 px-4 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-navy/10 focus:border-navy focus:outline-none transition-all duration-150"
                >
                  <option value="">Select Category</option>
                  {CIVIC_CATEGORIES.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                {errors.category && <span className="text-xs font-medium text-red-600">{errors.category.message}</span>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Subcategory *</label>
                <select
                  {...register('subcategory', { required: 'Subcategory is required' })}
                  disabled={!watchedCategory}
                  className="w-full h-11 px-4 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-navy/10 focus:border-navy focus:outline-none transition-all duration-150 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">Select Subcategory</option>
                  {currentSubcategories.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
                {errors.subcategory && <span className="text-xs font-medium text-red-600">{errors.subcategory.message}</span>}
              </div>
            </div>

            {/* Severity Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Estimated Severity</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'low', label: 'Low', color: 'hover:border-navy/30 peer-checked:bg-navy/5 peer-checked:text-navy peer-checked:border-navy' },
                  { value: 'medium', label: 'Medium', color: 'hover:border-amber-300 peer-checked:bg-amber-50 peer-checked:text-amber-700 peer-checked:border-amber-500' },
                  { value: 'high', label: 'High', color: 'hover:border-orange-300 peer-checked:bg-orange-50 peer-checked:text-orange-700 peer-checked:border-orange-500' },
                  { value: 'critical', label: 'Critical', color: 'hover:border-red-300 peer-checked:bg-red-50 peer-checked:text-red-700 peer-checked:border-red-500' }
                ].map(sev => (
                  <label key={sev.value} className="cursor-pointer">
                    <input
                      type="radio"
                      value={sev.value}
                      {...register('severity', { required: true })}
                      className="sr-only peer"
                    />
                    <div className={`py-3 text-center text-xs font-bold border border-slate-200 rounded-xl text-slate-600 transition-all duration-150 ${sev.color}`}>
                      {sev.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Image Selector & Cloud Storage Proof */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Attach Proof Image</label>
              
              <div className="flex gap-4 border-b border-slate-150 pb-2">
                {[
                  { value: 'upload', label: 'Device Upload', icon: Upload },
                  { value: 'camera', label: 'Camera Capture', icon: Camera }
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setImageOption(opt.value as any)}
                      className={`text-xs font-bold pb-1.5 border-b-2 transition-all flex items-center gap-1.5 ${
                        imageOption === opt.value ? 'border-navy text-navy' : 'border-transparent text-slate-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {imageOption === 'upload' && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-navy cursor-pointer transition-colors space-y-2 bg-slate-50/50 relative"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleUploadFileChange}
                    className="hidden"
                  />
                  {uploadedPreviewUrl ? (
                    <div className="relative max-w-xs mx-auto aspect-video rounded-xl overflow-hidden border border-slate-150 group">
                      <img src={uploadedPreviewUrl} alt="Device Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <button
                          type="button"
                          onClick={clearUploadedFile}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg shadow-md transition-colors uppercase tracking-wider cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-600">Drag & Drop or Click to Upload Image</p>
                      <p className="text-[10px] text-slate-400 font-medium">PNG, JPG, JPEG up to 5MB</p>
                    </div>
                  )}
                </div>
              )}

              {imageOption === 'camera' && (
                <div 
                  onClick={() => cameraInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-navy cursor-pointer transition-colors space-y-2 bg-slate-50/50 relative"
                >
                  <input
                    type="file"
                    ref={cameraInputRef}
                    capture="environment"
                    accept="image/*"
                    onChange={handleCameraFileChange}
                    className="hidden"
                  />
                  {capturedPreviewUrl ? (
                    <div className="relative max-w-xs mx-auto aspect-video rounded-xl overflow-hidden border border-slate-150 group">
                      <img src={capturedPreviewUrl} alt="Camera Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <button
                          type="button"
                          onClick={clearCapturedFile}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg shadow-md transition-colors uppercase tracking-wider cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Camera className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-600">Click to Trigger Mobile Camera Capture</p>
                      <p className="text-[10px] text-slate-400 font-medium">Requires environment camera permission</p>
                    </div>
                  )}
                </div>
              )}

              {/* AI Image Verification Feedback Callouts */}
              {imageAnalysis.loading && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 text-navy animate-spin shrink-0" />
                  <span>AI is verifying the photo's clarity and content...</span>
                </div>
              )}

              {imageAnalysis.analyzed && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
                  imageAnalysis.flaggedStatus === 'none' 
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' 
                    : imageAnalysis.flaggedStatus === 'clean_no_issue'
                    ? 'bg-amber-50/50 border-amber-200 text-amber-800'
                    : 'bg-rose-50/50 border-rose-200 text-rose-800'
                }`}>
                  {imageAnalysis.flaggedStatus === 'none' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : imageAnalysis.flaggedStatus === 'clean_no_issue' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold uppercase tracking-wider text-[10px]">
                      {imageAnalysis.flaggedStatus === 'none' 
                        ? 'AI Photo Verified: Valid' 
                        : imageAnalysis.flaggedStatus === 'clean_no_issue'
                        ? 'AI Photo Warning: No Issue Detected'
                        : 'AI Photo Error: Irrelevant or Blurry'}
                    </p>
                    <p>{imageAnalysis.feedback || 'Photo analysis complete.'}</p>
                    {imageAnalysis.flaggedStatus !== 'none' && (
                      <p className="text-[10px] font-semibold opacity-80 mt-1">
                        * Note: Reporting with invalid photos may cause your ticket to be automatically discarded first time.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Latitude & Longitude Coordinate Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Latitude *</label>
                <input
                  type="text"
                  readOnly
                  {...register('latitude', { required: 'Please drop a pinpoint on the map' })}
                  placeholder="28.7041"
                  className="w-full h-11 px-4 text-sm bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed outline-none font-mono"
                />
                {errors.latitude && <span className="text-xs font-medium text-red-600">{errors.latitude.message}</span>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Longitude *</label>
                <input
                  type="text"
                  readOnly
                  {...register('longitude', { required: 'Please drop a pinpoint on the map' })}
                  placeholder="77.1025"
                  className="w-full h-11 px-4 text-sm bg-slate-100 text-slate-500 border border-slate-200 rounded-xl cursor-not-allowed outline-none font-mono"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-navy hover:bg-navy-hover active:bg-navy-active text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
              id="btn-report-submit"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2 text-slate-100">
                  <Loader2 className="w-5 h-5 animate-spin text-saffron" />
                  <span>Submitting ({uploadProgress !== null ? `${uploadProgress}%` : 'Triage classification...'})</span>
                </div>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Submit Hyperlocal Incident Report
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Map & AI Copilot Panel */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setRightActiveTab('map')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                rightActiveTab === 'map' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Pinpoint Location
            </button>
            <button
              type="button"
              onClick={() => setRightActiveTab('copilot')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
                rightActiveTab === 'copilot' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Bot className="w-4 h-4" />
              AI Citizen Copilot
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-100 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-100" />
            </button>
          </div>

          {rightActiveTab === 'map' ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-navy" />
                  Incident Geotargeting
                </h3>
                <button
                  type="button"
                  onClick={() => handleGPSDetect(false)}
                  disabled={gpsLoading}
                  className="p-1.5 text-slate-400 hover:text-navy hover:bg-slate-50 rounded-lg transition-all"
                  title="Detect GPS Position"
                >
                  <RefreshCw className={`w-4 h-4 ${gpsLoading ? 'animate-spin text-navy' : ''}`} />
                </button>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed">
                Tap anywhere on the interactive map below or click the refresh button to trigger your phone's high-precision GPS auto-detection.
              </p>

              {/* Target City Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target City</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-navy/20 focus:border-navy focus:outline-none transition-all duration-150 cursor-pointer text-slate-700"
                >
                  {INDIAN_CITIES.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="h-80 w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner z-10" id="report-map-container">
                <MapContainer 
                  center={[mapCenter.lat, mapCenter.lng]} 
                  zoom={13} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapController center={mapCenter} />
                  <MapClickHandler />
                  {selectedLocation && (
                    <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
                  )}
                </MapContainer>
              </div>
              {selectedLocation ? (
                <div className="p-3 bg-accent-green/10 rounded-xl border border-accent-green/20 text-[11px] text-accent-green font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent-green shrink-0" />
                  <span>Geopoint Captured: {selectedLocation.lat.toFixed(5)}°N, {selectedLocation.lng.toFixed(5)}°E</span>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0 animate-pulse" />
                  <span>Waiting for location pinpoint...</span>
                </div>
              )}
            </div>
          ) : (
            /* AI Citizen Copilot Tab View (Feature 1, 9) */
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[520px]">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-navy animate-bounce" />
                    AI Citizen Copilot
                  </h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Triage Agent Live</span>
                  </div>
                </div>

                {/* Language Toggles */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setCopilotLanguage('en')}
                    className={`px-2 py-1 text-[10px] font-extrabold rounded transition-colors ${
                      copilotLanguage === 'en' ? 'bg-navy text-white' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopilotLanguage('hi')}
                    className={`px-2 py-1 text-[10px] font-extrabold rounded transition-colors ${
                      copilotLanguage === 'hi' ? 'bg-saffron text-slate-950' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    हिंदी
                  </button>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs mb-3 scrollbar-thin">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl font-medium leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-navy text-white rounded-br-none'
                        : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200 shadow-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 text-slate-500 px-4 py-3 rounded-2xl rounded-bl-none border border-slate-200 flex items-center gap-2 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-navy" />
                      <span>Copilot is drafting response...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions Chips */}
              <div className="mb-3 space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Quick Test Scenarios:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setChatInput("Water pipe burst flooding MG Road near metro station");
                      toast.success("Draft filled! Tap send.");
                    }}
                    className="text-[10px] bg-slate-50 text-slate-600 border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 hover:border-slate-300 font-semibold text-left cursor-pointer transition-colors"
                  >
                    💧 Pipe Burst (En)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChatInput("यहाँ बहुत कचरा पड़ा हुआ है, मवेशी खा रहे हैं");
                      toast.success("Draft filled! Tap send.");
                    }}
                    className="text-[10px] bg-slate-50 text-slate-600 border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 hover:border-slate-300 font-semibold text-left cursor-pointer transition-colors"
                  >
                    🗑️ कचरा ढेर (Hi)
                  </button>
                </div>
              </div>

              {/* Chat Input Bar */}
              <form 
                onSubmit={(e) => { e.preventDefault(); sendCopilotMessage(); }} 
                className="flex items-center gap-2 border border-slate-200 bg-slate-50 p-1.5 rounded-xl focus-within:bg-white focus-within:ring-2 focus-within:ring-navy/10 transition-all duration-150"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={copilotLanguage === 'en' ? "Ask copilot to write report..." : "शिकायत दर्ज करने के लिए कहें..."}
                  className="flex-1 bg-transparent px-2 py-1 text-xs text-slate-800 outline-none font-medium placeholder-slate-400"
                />

                <button
                  type="button"
                  onClick={toggleListeningChat}
                  className={`p-2 rounded-lg transition-all duration-150 cursor-pointer ${
                    isListeningChat 
                      ? 'bg-red-500 text-white animate-pulse shadow' 
                      : 'text-slate-400 hover:text-navy hover:bg-slate-200'
                  }`}
                  title={isListeningChat ? "Stop Dictating" : "Dictate Message"}
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>

                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  className="p-2 bg-navy text-white rounded-lg hover:bg-navy-hover transition-colors shadow-sm disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          <div className="bg-slate-950 text-slate-300 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-md">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              🛡️ Sentinel Shield Rules
            </h4>
            <p className="text-xs leading-relaxed">
              To ensure pristine emergency and work-order logs, you earn badges and reliability multipliers for each confirmed fix. Falsifying reports lowers credibility scores instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
