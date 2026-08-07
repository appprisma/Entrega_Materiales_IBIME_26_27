import { useState } from 'react';

// Lista editable genérica: agrega/quita renglones de texto. Se usa para
// documentos requeridos, libros de texto, papelería e IBIMEshop en el panel Admin.
export default function EditorListaItems({ titulo, items, onChange, placeholder }) {
  const [nuevo, setNuevo] = useState('');

  function agregar() {
    const valor = nuevo.trim();
    if (!valor || items.includes(valor)) return;
    onChange([...items, valor]);
    setNuevo('');
  }

  function quitar(valor) {
    onChange(items.filter((i) => i !== valor));
  }

  return (
    <div className="editor-lista">
      {titulo && <h4>{titulo}</h4>}
      {items.length === 0 && <p className="texto-ayuda">Sin elementos todavía.</p>}
      <ul className="lista-editable">
        {items.map((item) => (
          <li key={item}>
            {item}
            <button type="button" className="btn btn-ghost btn-chico" onClick={() => quitar(item)}>Quitar</button>
          </li>
        ))}
      </ul>
      <div className="barra-busqueda">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder={placeholder || 'Nuevo elemento'}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }}
        />
        <button type="button" className="btn btn-secundario" onClick={agregar}>Agregar</button>
      </div>
    </div>
  );
}
