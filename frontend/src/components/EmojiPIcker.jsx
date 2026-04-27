import React from 'react';

const commonEmojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  '👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '🤟',
  '🔥', '⭐', '🌟', '💯', '✅', '❌', '💔', '💕'
];

const SimpleEmojiPicker = ({ onEmojiSelect, onClose }) => {
  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-72">
      <div className="grid grid-cols-8 gap-2">
        {commonEmojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => {
              onEmojiSelect(emoji);
              onClose();
            }}
            className="text-2xl hover:bg-gray-100 p-2 rounded transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SimpleEmojiPicker;