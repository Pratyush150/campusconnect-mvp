import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
import { getSocket } from "../socket.js";
import { useAuth } from "../auth.jsx";

export default function Chat() {
  const { id } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    api.get(`/conversations/${id}/messages`)
      .then((r) => setMessages(r.data.messages))
      .catch((e) => setErr(e.response?.data?.error || "Failed"));

    const socket = getSocket();
    socket.emit("join", id, (ack) => {
      if (!ack?.ok) setErr(ack?.error || "Could not join");
    });
    const onMsg = (msg) => {
      if (msg.conversationId === id) setMessages((prev) => [...prev, msg]);
    };
    socket.on("receiveMessage", onMsg);
    return () => { socket.off("receiveMessage", onMsg); };
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    getSocket().emit("sendMessage", { conversationId: id, content: text }, (ack) => {
      if (!ack?.ok) setErr(ack?.error || "Send failed");
    });
    setText("");
  };

  return (
    <div className="container">
      <h2>Chat</h2>
      {err && <div className="error">{err}</div>}
      <div className="chat">
        <div className="messages" ref={scrollRef}>
          {messages.length === 0 && <div className="muted center">Say hi 👋</div>}
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.senderId === user.id ? "me" : "them"}`}>
              <div className="who">{m.sender?.name || (m.senderId === user.id ? "You" : "Them")}</div>
              {m.content}
            </div>
          ))}
        </div>
        <form className="composer" onSubmit={send}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}
