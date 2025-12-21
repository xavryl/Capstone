import { useState } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { HelpCircle, ChevronDown, ChevronUp, Send, Loader2, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- SWEETALERT IMPORT ---
import Swal from 'sweetalert2';

const FAQS = [
  {
    question: "How do I post a crop?",
    answer: "Go to the 'Post Crop' page, upload a photo, fill in the details (name, price, quantity), and click Submit. Your crop will immediately appear in the Marketplace."
  },
  {
    question: "How does Barter work?",
    answer: "When you see a crop you like, click 'Make Offer' and select 'Barter'. You will need to specify what item you are offering in exchange (e.g., '1 Sack of Rice for 10kg Corn')."
  },
  {
    question: "Is there a fee to use SakaNect?",
    answer: "No, SakaNect is free to use for farmers and buyers. We aim to help reduce food wastage without extra costs."
  },
  {
    question: "How do I report a fake listing?",
    answer: "Go to the crop details or the chat window with the user. Click the 'Alert' icon (Triangle) to submit a report to our Admin team."
  },
  {
    question: "I forgot my password. What do I do?",
    answer: "On the Login page, click 'Forgot Password?'. Enter your email address, and we will send you a link to reset it."
  }
];

export default function Support() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState(null);
  
  // Ticket State
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('General');
  const [loading, setLoading] = useState(false);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    
    // --- LOGIN CHECK WITH SWAL ---
    if (!user) {
        Swal.fire({
            title: 'Login Required',
            text: "Please log in to submit a support ticket.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            confirmButtonText: 'Go to Login'
        }).then((result) => {
            if (result.isConfirmed) navigate('/login');
        });
        return;
    }
    
    setLoading(true);
    try {
      await addDoc(collection(db, "tickets"), {
        userId: user.id,
        userName: user.username || user.name,
        email: user.email,
        subject,
        message,
        category,
        status: 'open', // open, in_progress, resolved
        createdAt: serverTimestamp()
      });
      
      // --- SUCCESS ALERT ---
      Swal.fire({
        icon: 'success',
        title: 'Ticket Submitted!',
        text: 'Our support team will contact you soon.',
        timer: 3000,
        showConfirmButton: false
      });

      setSubject('');
      setMessage('');
      setCategory('General');
    } catch (error) {
      console.error("Error submitting ticket:", error);
      
      // --- ERROR ALERT ---
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: 'Failed to submit ticket. Please try again.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Help Center</h1>
        <p className="text-gray-500">How can we help you today?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* LEFT: FAQ SECTION */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <HelpCircle className="text-saka-green" /> Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                <button 
                  onClick={() => toggleFaq(index)}
                  className="w-full flex justify-between items-center p-4 text-left font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                >
                  {faq.question}
                  {openIndex === index ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {openIndex === index && (
                  <div className="p-4 pt-0 text-sm text-gray-600 bg-gray-50 border-t border-gray-100">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: CONTACT FORM */}
        <div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <MessageSquare className="text-saka-green" /> Submit a Ticket
            </h2>
            <p className="text-sm text-gray-500 mb-6">Can't find what you're looking for? Send us a message.</p>

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none text-sm bg-white"
                >
                  <option value="General">General Inquiry</option>
                  <option value="Account">Account Issue</option>
                  <option value="Technical">Technical Bug</option>
                  <option value="Report">Safety Concern</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input 
                  type="text" 
                  placeholder="Brief summary of the issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea 
                  rows="4" 
                  placeholder="Describe your issue in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-saka-green outline-none text-sm resize-none"
                  required
                />
              </div>

              <button 
                disabled={loading}
                type="submit"
                className="w-full bg-saka-green text-white py-2.5 rounded-lg font-bold hover:bg-saka-dark transition shadow-md flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18}/> Submit Ticket</>}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}