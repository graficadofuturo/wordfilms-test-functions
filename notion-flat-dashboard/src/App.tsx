import { useState, useEffect } from 'react';

// ==========================================
// CONFIGURAÇÕES DA API DO NOTION
// ==========================================
// Insira sua chave de integração do Notion aqui
const NOTION_KEY = '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'; 
const PAGE_ID = 'da248786a2c949299279121cfbd8e336';

export default function App() {
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotionData = async () => {
    if (!NOTION_KEY) {
      setError('Por favor, insira sua NOTION_KEY no código (linha 6 de src/App.tsx).');
      setLoading(false);
      return;
    }

    try {
      // Usando o proxy local criado no server.ts para evitar problemas de CORS
      const url = `/api/notion-tasks?key=${encodeURIComponent(NOTION_KEY)}&pageId=${encodeURIComponent(PAGE_ID)}`;
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      let total = 0;
      let completed = 0;

      // Filtra apenas os blocos do tipo 'to_do'
      const todoBlocks = data.results.filter((block: any) => block.type === 'to_do');
      
      todoBlocks.forEach((block: any) => {
        total++;
        if (block.to_do.checked) {
          completed++;
        }
      });

      setTotalTasks(total);
      setCompletedTasks(completed);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar dados do Notion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Busca inicial
    fetchNotionData();

    // Polling a cada 7 segundos
    const intervalId = setInterval(fetchNotionData, 7000);

    return () => clearInterval(intervalId);
  }, []);

  const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col items-center justify-center font-sans">
      {error ? (
        <div className="bg-[#FF3333] text-white p-6 max-w-md text-center">
          <p className="font-bold mb-2 text-xl uppercase tracking-widest">Atenção</p>
          <p className="text-lg">{error}</p>
        </div>
      ) : loading && totalTasks === 0 ? (
        <div className="text-[#39FF14] text-2xl font-bold tracking-widest uppercase">
          Carregando...
        </div>
      ) : (
        <div className="flex flex-col items-center w-full max-w-3xl px-8">
          {/* Porcentagem Grande */}
          <div className="text-[#39FF14] text-[12rem] leading-none font-black mb-8 tracking-tighter">
            {percentage}%
          </div>

          {/* Barra de Progresso Flat */}
          <div className="w-full h-12 bg-[#E0E0E0] mb-6">
            <div 
              className="h-full bg-[#39FF14] transition-all duration-500 ease-in-out"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>

          {/* Texto de Status */}
          <div className="text-[#A0A0A0] text-2xl font-medium tracking-wide uppercase">
            {completedTasks} de {totalTasks} tarefas concluídas
          </div>
        </div>
      )}
    </div>
  );
}
