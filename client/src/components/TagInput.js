import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import './TagInput.css';

export default function TagInput({ tags, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const inputRef = useRef();

  function addTag(value) {
    const trimmed = value.trim().replace(/,$/, '');
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function handleBlur() {
    if (input.trim()) addTag(input);
  }

  return (
    <div className="tag-input" onClick={() => inputRef.current?.focus()}>
      {tags.map((tag) => (
        <span key={tag} className="tag">
          {tag}
          <button
            type="button"
            className="tag-remove"
            onClick={(e) => { e.stopPropagation(); onChange(tags.filter((t) => t !== tag)); }}
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="tag-text-input"
      />
    </div>
  );
}
