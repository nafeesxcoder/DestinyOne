import { Mic, Paperclip, Send, Smile, Square } from "lucide-react";
import { useState } from "react";

export default function ChatComposer({ onSend, onTyping, onAttach, onEmoji, onVoice, recording = false, online = true }) {
  const [text, setText] = useState("");
  function submit(event) {
    event.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
    onTyping?.(false);
  }
  return (
    <form className="pro-chat-composer" onSubmit={submit}>
      {!online && <div className="pro-chat-offline">Offline · your message will keep one tick until connected</div>}
      <button className="pro-chat-icon-button" type="button" aria-label="Add attachment" onClick={onAttach}><Paperclip size={19} /></button>
      <div className="pro-chat-input-wrap">
        <input aria-label="Message" value={text} onChange={(event) => { setText(event.target.value); onTyping?.(Boolean(event.target.value)); }} placeholder="Write a message..." />
        <button className="pro-chat-emoji" type="button" aria-label="Open emoji picker" onClick={onEmoji}><Smile size={19} /></button>
      </div>
      {!text.trim() && <button className={`pro-chat-icon-button ${recording ? "recording" : ""}`} type="button" aria-label={recording ? "Stop voice recording" : "Record voice note"} onClick={onVoice}>{recording ? <Square size={17} /> : <Mic size={19} />}</button>}
      <button className="pro-chat-send" type="submit" aria-label="Send message" disabled={!text.trim()}><Send size={18} /></button>
    </form>
  );
}
