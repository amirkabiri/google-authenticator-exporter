import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

interface ExportNameModalProps {
  isOpen: boolean;
  defaultName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const ExportNameModal: React.FC<ExportNameModalProps> = ({
  isOpen,
  defaultName,
  onConfirm,
  onCancel,
}) => {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setName(defaultName);
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isOpen, defaultName]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onConfirm(trimmed);
  };

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <form className="export-name-dialog" onSubmit={handleSubmit}>
        <h3>Export as JSON</h3>
        <label htmlFor="export-file-name">File name</label>
        <input
          id="export-file-name"
          ref={inputRef}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="my-authenticator-backup"
        />
        <p className="export-name-hint">
          .json will be added automatically. Save it in the data/ folder to load
          it on startup next time.
        </p>
        <div className="export-name-actions">
          <button
            type="button"
            className="export-button cancel-button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="export-button json-button"
            disabled={!name.trim()}
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExportNameModal;
