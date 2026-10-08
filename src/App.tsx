import Player from './components/Player';
import backgroundImage from './assets/background/main-background.png';

function App() {
  return (
    <div 
      className="min-h-screen text-primary selection:bg-highlight/20 font-sans bg-cover bg-center bg-no-repeat fixed inset-0 overflow-y-auto"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Dark overlay to ensure the UI remains readable */}
      <div className="fixed inset-0 bg-background/30 backdrop-blur-[2px] -z-10"></div>
      
      <Player />
    </div>
  );
}

export default App;
