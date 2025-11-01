import { useState, useEffect } from 'react';
import { auth, db } from './firebase'; 
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
    collection,
    doc,
    setDoc,
    onSnapshot,
    serverTimestamp,
    deleteDoc,
} from 'firebase/firestore'; 
import axios from 'axios';
import './App.css';

// --- Firestore Constants ---
const getCollectionPath = (userId) => `users/${userId}/documents`; 


// --- Main App Component (Unchanged) ---
function App() {
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="app-container">
      {user ? <Dashboard currentUser={user} /> : <Login />}
    </div>
  );
}

// --- Login Component (Unchanged) ---
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">AI Knowledge Assistant</h2>
        <form className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <div className="login-buttons">
            <button onClick={handleLogin} className="login-button">
              Login
            </button>
            <button onClick={handleSignUp} className="signup-button">
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Dashboard Component (UPDATED) ---
function Dashboard({ currentUser }) {
  const [documents, setDocuments] = useState([]); 

  const handleLogout = () => {
    signOut(auth);
  };

  // Effect to listen for real-time document changes in Firestore
  useEffect(() => {
    if (!currentUser) return;

    const documentsRef = collection(db, getCollectionPath(currentUser.uid));
    const unsubscribe = onSnapshot(documentsRef, (snapshot) => {
      const docsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      docsList.sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
      setDocuments(docsList);
    }, (error) => {
        console.error("Firestore Error:", error);
    });

    return () => unsubscribe(); 
  }, [currentUser]);


  // Delete document logic
  const handleDelete = async (docId, filename) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}? This will remove it from the database.`)) {
      return;
    }

    try {
      // 1. Delete the file record from Firestore
      const docRef = doc(db, getCollectionPath(currentUser.uid), docId);
      await deleteDoc(docRef);

      // 2. Note: A dedicated backend endpoint is required to fully clean ChromaDB. 
      console.log(`Document ${filename} deleted from Firestore.`);

    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };


  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <h1 className="dashboard-title">Welcome, {currentUser.email}</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </nav>
      
      {/* Main content area */}
      <main className="dashboard-main">
        <FileUpload currentUser={currentUser} documents={documents} handleDelete={handleDelete} />
        <Chat documents={documents} handleDelete={handleDelete} />
      </main>
    </div>
  );
}

// --- File Upload Component (Unchanged) ---
function FileUpload({ currentUser, documents, handleDelete }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a file first.');
      setMessageType('error');
      return;
    }

    setIsUploading(true);
    setMessage('Uploading and processing...');
    setMessageType('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Send file to Python backend for vectorization
      const response = await axios.post('http://127.0.0.1:8000/upload', formData);
      const data = response.data;

      if (data.status === 'success') {
        
        // 2. Save the document metadata to Firestore
        const docId = data.filename.replace(/\s+/g, '-').toLowerCase();
        
        await setDoc(doc(db, getCollectionPath(currentUser.uid), docId), {
            filename: data.filename,
            chunkCount: data.chunk_count,
            vectorsStored: data.vectors_stored,
            uploadedAt: serverTimestamp(), 
            userId: currentUser.uid
        });

        setMessage(`File processed! ${data.vectors_stored} vector(s) stored.`);
        setMessageType('success');
      } else {
        setMessage('Error processing file.');
        setMessageType('error');
      }
    } catch (err) {
      console.error(err);
      setMessage('An error occurred during upload. Is the backend server running?');
      setMessageType('error');
    }

    setIsUploading(false);
    setFile(null);
    e.target.reset();
  };

  return (
    <div className="upload-container">
      <h2 className="upload-title">Upload a Document</h2>
      <form onSubmit={handleUpload} className="upload-form">
        <input type="file" onChange={handleFileChange} accept=".pdf" />
        <button type="submit" disabled={isUploading || !file}>
          {isUploading ? 'Processing...' : 'Upload'}
        </button>
      </form>
      {message && (
        <p className={`upload-message ${messageType}`}>{message}</p>
      )}

      {/* NEW: Document History Section */}
      <DocumentHistory documents={documents} handleDelete={handleDelete} /> 
    </div>
  );
}

// --- NEW: Document History Component (UPDATED with Summarize function) ---
function DocumentHistory({ documents, handleDelete }) {
    const [isSummarizing, setIsSummarizing] = useState(false);
    
    // NEW: Handle Summarization Logic
    const handleSummarize = async (filename) => {
        setIsSummarizing(true);
        try {
            // Post filename to backend /summarize endpoint
            const response = await axios.post('http://127.0.0.1:8000/summarize', {
                filename: filename
            });

            if (response.data.status === 'success') {
                alert(`Summary for ${filename}:\n\n${response.data.summary}`);
            } else {
                alert(`Error summarizing ${filename}: ${response.data.message}`);
            }
        } catch (error) {
            console.error("Summarization Error:", error);
            alert("Error connecting to the backend for summarization.");
        }
        setIsSummarizing(false);
    };


    if (documents.length === 0) {
        return <p className="history-empty">Upload a PDF to start building your knowledge base.</p>;
    }

    return (
        <div className="document-history-box">
            <h3 className="history-title">My Documents ({documents.length})</h3>
            <ul className="history-list">
                {documents.map(doc => (
                    <li key={doc.id} className="history-item">
                        <span className="file-name">{doc.filename}</span>
                        <div className="document-actions">
                            <button
                                className="summary-button"
                                onClick={() => handleSummarize(doc.filename)}
                                disabled={isSummarizing}
                            >
                                {isSummarizing ? '...' : 'Summary'}
                            </button>
                            <span className="file-info">{doc.chunkCount} chunks</span>
                            <button 
                                className="delete-button" 
                                onClick={() => handleDelete(doc.id, doc.filename)}
                                >
                                &times;
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}


// --- Chat Component (Unchanged) ---
function Chat({ documents }) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: 'Upload documents on the left and ask me any questions about them.'
    }
  ]);

  const handleSubmitQuery = async (e) => {
    e.preventDefault();
    if (!query) return;

    const userMessage = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setQuery('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/query', {
        query_text: query
      });

      if (response.data.status === 'success') {
        const aiMessage = { role: 'ai', content: response.data.answer };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        const aiMessage = { role: 'ai', content: 'Sorry, I ran into an error. Check the backend console.' };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (err) {
      console.error(err);
      const aiMessage = { role: 'ai', content: 'Error connecting to the AI. Is the backend server running?' };
      setMessages((prev) => [...prev, aiMessage]);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="chat-container">
        {/* NEW: History/Status in the chat panel */}
        <div className="chat-header">
            <h2 className="chat-title">Chat with your AI</h2>
            <div className="doc-status">
                {documents.length > 0 ? (
                    <span className="status-ready">{documents.length} File(s) Ready</span>
                ) : (
                    <span className="status-empty">No Files Uploaded</span>
                )}
            </div>
        </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="chat-message loading">
            AI is thinking...
          </div>
        )}
      </div>
      <form onSubmit={handleSubmitQuery} className="chat-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question about your document..."
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}

export default App;