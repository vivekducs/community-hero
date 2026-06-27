import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../context/AuthContext';
import { useIssueStore } from '../store';
import { db, storage } from '../firebaseConfig';
import { Issue, LatLng } from '../types';
import { apiFetch } from '../api';
import { openDB } from 'idb';
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
  WifiOff
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
  const [imageOption, setImageOption] = useState<'preset' | 'upload' | 'camera'>('preset');
  const [selectedPreset, setSelectedPreset] = useState(IMAGE_PRESETS[0].url);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

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

  // Trigger GPS auto-detect
  const handleGPSDetect = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
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
        toast.error("Could not obtain GPS permission or accuracy.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Run GPS auto detect on initial mount
  useEffect(() => {
    handleGPSDetect();

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

  // Text-based AI classification trigger
  const handleAiAnalysis = async () => {
    if (!watchedTitle || watchedTitle.length < 10) {
      toast.error("Please enter a title (minimum 10 chars) first for AI Analysis!");
      return;
    }

    setAiSuggestions(prev => ({ ...prev, loading: true }));

    try {
      const response = await apiFetch('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: watchedTitle, description: watchedDescription || "No detailed description provided." })
      });

      if (response.ok) {
        const data = await response.json();
        setAiSuggestions({
          category: data.category || 'Roads',
          subcategory: data.subcategory || 'Pothole',
          department: data.department || 'Department of Transportation',
          severity: data.severity || 'medium',
          confidence: data.confidence || 92,
          loading: false
        });

        // Autofill form
        setValue('category', data.category);
        setValue('subcategory', data.subcategory);
        setValue('severity', data.severity);
        toast.success(`AI suggested: ${data.category} (${data.confidence}% confidence)`);
      } else {
        throw new Error();
      }
    } catch (err) {
      console.error(err);
      toast.error("AI Insights server busy. Fallback prediction applied.");
      
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      toast.success("Image selected!");
    }
  };

  const uploadToStorage = async (file: File | Blob | string, issueId: string): Promise<string> => {
    const convertToBase64AndResolve = async (blob: Blob): Promise<string> => {
      try {
        const base64Str = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(blob);
        });
        toast.success("Image optimized for cloud submission!", { id: 'upload-toast' });
        return base64Str;
      } catch (err) {
        throw new Error("Failed to encode image to base64.");
      }
    };

    return new Promise(async (resolve, reject) => {
      const timeoutTime = 45000; // 45 seconds timeout
      const timeoutId = setTimeout(async () => {
        try {
          console.warn("Upload timed out, falling back to local encoding");
          let fileToUpload: File | Blob;
          if (typeof file === 'string') {
            const res = await fetch(file);
            fileToUpload = await res.blob();
          } else {
            fileToUpload = file;
          }
          const base64Str = await convertToBase64AndResolve(fileToUpload);
          resolve(base64Str);
        } catch (e) {
          reject(new Error("Upload timed out and fallback encoding failed."));
        }
      }, timeoutTime);

      try {
        let fileToUpload: File | Blob;
        
        // Fix for Native path/URIs often provided by web views or native cameras
        if (typeof file === 'string') {
          const res = await fetch(file);
          fileToUpload = await res.blob();
        } else {
          fileToUpload = file;
        }

        toast.loading("Compressing image to save bandwidth...", { id: 'upload-toast' });
        
        // Compress image client-side before upload
        const options = {
          maxSizeMB: 0.15, // Target smaller size for safer base64 and fast upload
          maxWidthOrHeight: 1024,
          useWebWorker: true,
          initialQuality: 0.7
        };
        
        let compressedFile: Blob;
        try {
          compressedFile = await imageCompression(fileToUpload as File, options);
        } catch (compErr) {
          console.warn("Image compression failed, using original file:", compErr);
          compressedFile = fileToUpload;
        }

        toast.loading("Uploading image to Cloud Storage...", { id: 'upload-toast' });
        
        const filename = (compressedFile as File).name || 'upload.jpg';
        const storageRef = ref(storage, `issues/${issueId}/${Date.now()}_${filename}`);
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);

        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(progress);
          }, 
          async (error) => {
            clearTimeout(timeoutId);
            console.warn("Storage upload failed, using secure base64 fallback:", error);
            try {
              const base64Str = await convertToBase64AndResolve(compressedFile);
              resolve(base64Str);
            } catch (fbErr: any) {
              reject(new Error(`Upload failed: ${error.message} (Fallback failed: ${fbErr.message})`));
            }
          }, 
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              clearTimeout(timeoutId);
              resolve(downloadUrl);
            } catch (err: any) {
              console.warn("Failed to get download URL, using secure base64 fallback:", err);
              try {
                const base64Str = await convertToBase64AndResolve(compressedFile);
                clearTimeout(timeoutId);
                resolve(base64Str);
              } catch (fbErr: any) {
                clearTimeout(timeoutId);
                reject(new Error(`Failed to verify upload: ${err.message} (Fallback failed: ${fbErr.message})`));
              }
            }
          }
        );
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn("Image processing error, using secure base64 fallback:", err);
        try {
          let fileToUpload: File | Blob;
          if (typeof file === 'string') {
            const res = await fetch(file);
            fileToUpload = await res.blob();
          } else {
            fileToUpload = file;
          }
          const base64Str = await convertToBase64AndResolve(fileToUpload);
          resolve(base64Str);
        } catch (fbErr: any) {
          reject(new Error(`Failed to process image: ${err.message} (Fallback failed: ${fbErr.message})`));
        }
      }
    });
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
    let finalImageUrl = selectedPreset;

    try {
      // 1. Upload custom image if chosen
      if ((imageOption === 'upload' || imageOption === 'camera') && customFile) {
        toast.loading("Uploading proof image to Cloud Storage...", { id: 'upload-toast' });
        finalImageUrl = await uploadToStorage(customFile, issue_id);
        toast.success("Image uploaded successfully!", { id: 'upload-toast' });
      }

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
      toast.error(err.message || "Failed to upload image or submit issue.", { id: 'upload-toast' });
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
            
            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Incident Title *</label>
              <input
                type="text"
                {...register('title', { 
                  required: 'Title is required', 
                  minLength: { value: 10, message: 'Minimum 10 characters required' } 
                })}
                placeholder="e.g. Broken water pipeline flooding main lane"
                className="w-full h-11 px-4 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-navy/10 focus:border-navy focus:outline-none transition-all duration-150"
              />
              {errors.title && <span className="text-xs font-medium text-red-600">{errors.title.message}</span>}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Incident Details (Optional)</label>
              <textarea
                rows={4}
                {...register('description')}
                placeholder="Include size, duration, or any potential road hazards to assist responding public service units..."
                className="w-full p-4 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-navy/10 focus:border-navy focus:outline-none transition-all duration-150 resize-none"
              ></textarea>
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
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className="p-4 bg-accent-green/5 border border-accent-green/20 rounded-xl flex items-start gap-3"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -25 }}
                  animate={{ scale: [0, 1.35, 1], rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 12, delay: 0.15 }}
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
                  { value: 'preset', label: 'Pick Preset', icon: ImageIcon },
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

              {imageOption === 'preset' && (
                <div className="grid grid-cols-4 gap-3">
                  {IMAGE_PRESETS.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setSelectedPreset(preset.url)}
                      className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                        selectedPreset === preset.url ? 'border-navy shadow-sm scale-95' : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-slate-900/60 p-1 text-[9px] text-white text-center font-medium font-mono">
                        {preset.label}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {imageOption === 'upload' && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-navy cursor-pointer transition-colors space-y-2 bg-slate-50/50"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {previewUrl ? (
                    <div className="max-w-xs mx-auto aspect-video rounded-xl overflow-hidden border border-slate-100">
                      <img src={previewUrl} alt="Device Preview" className="w-full h-full object-cover" />
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
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-navy cursor-pointer transition-colors space-y-2 bg-slate-50/50"
                >
                  <input
                    type="file"
                    ref={cameraInputRef}
                    capture="environment"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {previewUrl ? (
                    <div className="max-w-xs mx-auto aspect-video rounded-xl overflow-hidden border border-slate-100">
                      <img src={previewUrl} alt="Camera Preview" className="w-full h-full object-cover" />
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

        {/* Right Map Panel */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-navy" />
                Incident Geotargeting
              </h3>
              <button
                type="button"
                onClick={handleGPSDetect}
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
