import type { DataFile } from "../utils/dataFiles";

interface DataFileListProps {
  files: DataFile[];
  title: string;
  hint?: string;
  onSelect: (file: DataFile) => void;
}

const DataFileList: React.FC<DataFileListProps> = ({
  files,
  title,
  hint,
  onSelect,
}) => (
  <div className="otp-selector data-file-selector">
    <h2>{title}</h2>
    {hint && <p className="data-file-hint">{hint}</p>}
    <div className="account-list">
      {files.map((file) => (
        <button
          type="button"
          key={file.path}
          className="account-item data-file-item"
          onClick={() => onSelect(file)}
        >
          <span className="account-issuer">{file.name}</span>
          <span className="account-name">
            {file.fileName} &middot; {file.accounts.length} account
            {file.accounts.length === 1 ? "" : "s"}
          </span>
        </button>
      ))}
    </div>
  </div>
);

export default DataFileList;
