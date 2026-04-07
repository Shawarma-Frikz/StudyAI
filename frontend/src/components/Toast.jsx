import { useApp } from "../context/AppContext";

export default function Toast() {
  const { toast } = useApp();
  return (
    <div className={`toast${toast.visible ? " show" : ""}${toast.error ? " error" : ""}`}>
      {toast.message}
    </div>
  );
}
