import Image from 'next/image'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#f5f5f0] dark:bg-[#0d0d0b]">

    
      <span
        aria-hidden
        className="pointer-events-none select-none absolute inset-0 flex items-center justify-center text-[28vw] font-black leading-none tracking-tighter text-black/[0.04] dark:text-white/[0.04]"
      >
        404
      </span>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-[#4ade80]/10 dark:bg-[#4ade80]/5 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 gap-2">

     
        <div
          className="w-84 h-84 md:w-85 md:h-85 relative"
         
        >
          <Image
            src="/notfound.png"
            alt="Gatinho confuso olhando para o laptop"
            fill
            className="object-contain drop-shadow-xl"
            priority
          />
        </div>


        <div className="mt-2 space-y-1">
        
          <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            Página não encontrada
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base max-w-xs mx-auto leading-relaxed">
            A Ifigênia também ficou confusa.<br />Essa página não existe ou foi movida.
          </p>
        </div>

       
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-semibold shadow-lg hover:scale-[1.03] hover:shadow-xl active:scale-[0.98] transition-all duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Voltar ao início
        </Link>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </main>
  )
}
