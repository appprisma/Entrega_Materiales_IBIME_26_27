import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';

export default function AdminGate({ children }) {
  const { autorizado, entrarAdmin } = useAdmin();
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');

  if (autorizado) return children;

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await entrarAdmin(clave);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="pantalla-login">
      <form className="tarjeta-login" onSubmit={onSubmit}>
        <div className="marca marca-login">
          <span className="marca-punto" />
          IBIME · Admin
        </div>
        <p className="subtitulo-login">Catálogos de documentos, materiales e inventario</p>
        <label>
          Clave de administración
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Clave de administración"
            autoFocus
            required
          />
        </label>
        {error && <div className="alerta alerta-error">{error}</div>}
        <button className="btn btn-primario" type="submit">Entrar</button>
      </form>
    </div>
  );
}
