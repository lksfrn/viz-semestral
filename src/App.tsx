import { useEffect, useState } from 'react'
import ForceGraph from './components/ForceGraph5'
import Histogram from './components/Histogram'
import { JsonData, RowData } from './interfaces'

function App() {
   const [data, setData] = useState<any>(null)

   // fetch data
   useEffect(() => {
      fetch('/data/miserables.json')
         .then((res) => res.json())
         .then((res) => {
            setData(res)
         })
   }, [])

   if (!data) {
      return <div>Loading...</div>
   }

   return <ForceGraph data={data} />
}

export default App
