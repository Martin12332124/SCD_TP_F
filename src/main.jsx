import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Tipografías empaquetadas con la app (no se descargan de internet: REF-08).
// Fraunces para la marca y los números de mesa; Barlow para el texto; Barlow Condensed
// para temporizadores y datos de las comandas.
import '@fontsource-variable/fraunces';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './index.css';
import Sesion from './componentes/Sesion.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sesion />
  </StrictMode>
);
