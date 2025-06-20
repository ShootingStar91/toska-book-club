import { useQuery } from '@tanstack/react-query'
import { fetchHelloWorld } from './api'
import './App.css'

function App() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['helloWorld'],
    queryFn: fetchHelloWorld,
  })

  const getSubtitleColor = () => {
    if (isLoading) return 'white'
    if (isError) return 'red'
    if (data === 'Hello world') return 'green'
    return 'white'
  }

  return (
    <div className="app">
      <h1 className="title">Toska Book Club</h1>
      <p className="subtitle" style={{ color: getSubtitleColor() }}>
        Under construction.
      </p>
    </div>
  )
}

export default App
