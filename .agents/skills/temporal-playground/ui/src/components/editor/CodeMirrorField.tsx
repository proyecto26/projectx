import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
import { useCallback } from "react";

interface CodeMirrorFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
}

const extensions = [javascript({ typescript: true })];

/**
 * CodeMirror 6 field with TypeScript/JavaScript syntax highlighting.
 * Used in the detail panel for "code" type fields.
 */
export function CodeMirrorField({
  value,
  onChange,
  placeholder,
  minHeight = "100px",
  readOnly = false,
}: CodeMirrorFieldProps) {
  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
    },
    [onChange],
  );

  return (
    <div className="codemirror-wrapper overflow-hidden rounded-md border border-white/[0.08]">
      <CodeMirror
        value={value}
        onChange={handleChange}
        theme={oneDark}
        extensions={extensions}
        placeholder={placeholder}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          autocompletion: false,
          bracketMatching: true,
          closeBrackets: true,
          indentOnInput: true,
        }}
        style={{ fontSize: "11px", minHeight }}
      />
    </div>
  );
}
