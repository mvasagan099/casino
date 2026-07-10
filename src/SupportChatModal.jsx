import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';
import { useSocket } from './context/SocketContext';
import { useAuth } from './context/AuthContext';
import './support-chat.css';

export default function SupportChatModal({ onClose }) {
  const { socket, onlineUsers } = useSocket();
  const { user } = useAuth();
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'system', text: 'Welcome to Global Chat! Please be respectful.' }
  ]);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      setMessages(prev => [...prev, { 
        sender: data.userId === user?.id ? 'me' : 'other', 
        username: data.username,
        text: data.message 
      }]);
    };

    socket.on('chat:message', handleNewMessage);
    return () => socket.off('chat:message', handleNewMessage);
  }, [socket, user]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!msg.trim() || !socket) return;
    socket.emit('chat:message', { message: msg });
    setMsg('');
  };

  return (
    <div className="support-modal-overlay" onClick={onClose}>
      <div className="support-modal" onClick={e => e.stopPropagation()}>
        <div className="support-header">
          <div className="support-title">
            <MessageSquare size={20} /> Global Chat
            <span style={{ fontSize: '12px', color: '#00e701', marginLeft: '12px' }}>
              ● {onlineUsers} Online
            </span>
          </div>
          <button className="support-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="support-body" ref={bodyRef}>
          {messages.map((m, i) => (
            <div key={i} className={`support-msg ${m.sender === 'system' ? 'agent' : m.sender === 'me' ? 'user' : 'other'}`}>
              <div className="support-msg-bubble">
                {m.sender !== 'system' && m.sender !== 'me' && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold' }}>
                    {m.username}
                  </div>
                )}
                {m.text}
              </div>
            </div>
          ))}
        </div>
        
        <div className="support-footer">
          {user ? (
            <>
              <input 
                type="text" 
                placeholder="Type your message..." 
                value={msg} 
                onChange={e => setMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button onClick={handleSend}><Send size={18} /></button>
            </>
          ) : (
            <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', padding: '10px 0' }}>
              Please sign in to chat.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
