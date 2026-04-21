import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((msg, variant = "info", ttl = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, variant }]);
    if (ttl > 0) setTimeout(() => dismiss(id), ttl);
    return id;
  }, [dismiss]);

  const api = {
    show: push,
    success: (msg, ttl) => push(msg, "success", ttl),
    error:   (msg, ttl) => push(msg, "error", ttl),
    info:    (msg, ttl) => push(msg, "info", ttl),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.variant}`} onClick={() => dismiss(t.id)}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// Confirm modal hook — programmatic, returns a Promise<boolean>
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const ask = useCallback(({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false }) => {
    return new Promise((resolve) => {
      setState({ title, message, confirmLabel, cancelLabel, danger, resolve });
    });
  }, []);

  const close = (value) => { state?.resolve(value); setState(null); };

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {state && (
        <div className="modal-backdrop" onClick={() => close(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {state.title && <h3>{state.title}</h3>}
            {state.message && <p className="muted">{state.message}</p>}
            <div className="row" style={{ maxWidth: 300, marginTop: 16 }}>
              <button className="secondary" onClick={() => close(false)}>{state.cancelLabel}</button>
              <button className={state.danger ? "danger" : ""} onClick={() => close(true)}>{state.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

// Prompt modal — returns Promise<string|null>
const PromptContext = createContext(null);

export function PromptProvider({ children }) {
  const [state, setState] = useState(null);
  const [value, setValue] = useState("");

  const ask = useCallback((opts) => {
    return new Promise((resolve) => {
      setValue(opts.initial || "");
      setState({
        title: opts.title || "Enter value",
        label: opts.label || "",
        placeholder: opts.placeholder || "",
        multiline: !!opts.multiline,
        confirmLabel: opts.confirmLabel || "OK",
        validator: opts.validator,
        resolve,
      });
    });
  }, []);

  const close = (val) => { state?.resolve(val); setState(null); };
  const onSubmit = (e) => {
    e.preventDefault();
    if (state.validator) {
      const err = state.validator(value);
      if (err) return; // could set a local error state; skip for brevity
    }
    close(value);
  };

  return (
    <PromptContext.Provider value={ask}>
      {children}
      {state && (
        <div className="modal-backdrop" onClick={() => close(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
            <h3>{state.title}</h3>
            {state.label && <label>{state.label}</label>}
            {state.multiline
              ? <textarea rows={4} autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={state.placeholder} />
              : <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={state.placeholder} />}
            <div className="row" style={{ maxWidth: 300, marginTop: 16 }}>
              <button type="button" className="secondary" onClick={() => close(null)}>Cancel</button>
              <button type="submit">{state.confirmLabel}</button>
            </div>
          </form>
        </div>
      )}
    </PromptContext.Provider>
  );
}

export const usePrompt = () => useContext(PromptContext);
