import { useState, useRef, useEffect } from 'react'
import { sendChatMessage } from '../services/api'

export default function ChatBox({ chatHistory, setChatHistory }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const handleSend = async () => {
    const q = input.trim()
    if (!q || loading) return

    const userMsg = { role: 'user', text: q }
    setChatHistory(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await sendChatMessage(q)
      const answer = res.answer || res.message || 'No response.'
      setChatHistory(prev => [...prev, { role: 'assistant', text: answer }])
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', text: `Error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chatbox">
      <div className="chatbox-header">
        <span>💬 Investigation Chat</span>
        <span className="chat-badge">{chatHistory.length} msgs</span>
      </div>

      <div className="chatbox-messages">
        {chatHistory.length === 0 && (
          <div className="chat-empty">Ask a question about the investigation...</div>
        )}
        {chatHistory.map((msg, i) => (
          <div key={i} className={`chat-msg chat-${msg.role}`}>
            <div className="chat-bubble">{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg chat-assistant">
            <div className="chat-bubble chat-loading">Thinking...</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="chatbox-input">
        <input
          type="text"
          placeholder="Ask about the case..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}
