import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const [matricula, setMatricula] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await iniciarSesion(matricula, clave);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pantalla-login">
      <form className="tarjeta-login" onSubmit={onSubmit}>
        <div className="marca marca-login">
          <span className="marca-punto" />
          IBIME
        </div>
        <p className="subtitulo-login">Entrega y recepción de materiales</p>

        <label>
          Matrícula de empleado
          <input
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            placeholder="Ej. E1023"
            autoFocus
            required
          />
        </label>

        <label>
          Clave de acceso
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Clave general del ciclo"
            required
          />
        </label>

        {error && <div className="alerta alerta-error">{error}</div>}

        <button className="btn btn-primario" type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="nota-login">
          Cada acción queda registrada con tu matrícula y hora. Sé preciso al entregar.
        </p>
      </form>
    </div>
  );
}
