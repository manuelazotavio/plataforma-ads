type LoadingScreenProps = {
  message?: string
}

export default function LoadingScreen({ message = 'Carregando o ADS Conecta' }: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 dark:bg-zinc-950">
      <LoadingState message={message} />
    </div>
  )
}

export function LoadingState({ message = 'Carregando' }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{message}</p>
        <div className="mx-auto mt-2 h-1 w-28 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="h-full w-1/2 rounded-full bg-[#2F9E41] loading-progress" />
        </div>
      </div>
    </div>
  )
}
