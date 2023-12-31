
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <div>
    <h2>Activity Information</h2>
    <label>Title: <input type="text" id="title"></label>
    <br/><br/>

    <label>Date: <input type="date" id="date" /></label>
    <br/><br/>

    <label>Link: <input type="text" id="link" /></label>
    <br/><br/>
      
    <label>Description: <textarea id="description" cols="30" rows="3"></textarea></label>
    <br/><br/>

    <input type="file" id="file" accept=".kml" onchange="renderKMLdata()">
  </div>
  <hr />

  <div>
    <h3>Routes</h3>
    <ul id="route-area"></ul>
    <button onclick="renderRouteData()">Add Route</button>
  </div>
  <hr />

  <div>
    <h3>Locations</h3>
    <ul id="location-area"></ul>
  </div>
  <hr />

  <br/><br/>
  <button onclick="save()">Save</button>

  <script type="text/javascript">
    async function renderKMLdata() {
      const kmlText = await readFile()
      const kmlData = parseKml(kmlText)
      const routeData = kmlData.folder.filter(d => d.type === 'route')
      const locationData = kmlData.folder.filter(d => d.type === 'location')

      document.querySelector('#title').value = kmlData.title
      routeData.forEach(route => renderRouteData(route))
      locationData.forEach(location => renderLocationData(location))
    }

    function parseKml(text) {
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'application/xml')
      const folders = doc.querySelectorAll('Folder')
      const kmlData = {
        title: doc.querySelector('Document').querySelector('name').textContent,
        folder: []
      }

      folders.forEach(folder => kmlData.folder.push(getFolderInfo(folder)))
      return kmlData
    }

    function readFile() {
      const file = document.querySelector('#file').files[0]
      let text = ''

      if (!file) {
        alert('No file selected')
        return
      }

      if (file.name.split('.')[1] !== 'kml') {
        alert('File type must be .kml')
        return
      }

      const reader = new FileReader()
      reader.readAsText(file)

      return new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
      })
    }

    function getFolderInfo(folder) {
      const locations = []
      const info = {
        name: folder.querySelector('name').textContent,
        type: isRoute(folder) ? 'route' : 'location',
        content: ''
      }

      if (info.type === 'location') {
        const placemarks = folder.querySelectorAll('Placemark')
        info.content = []
        placemarks.forEach(placemark => {
          info.content.push({
            name: placemark.querySelector('name').textContent,
            coordinates: placemark.querySelector('Point').querySelector('coordinates').textContent.replaceAll(',0', '')
          })
        })
      } else if (info.type === 'route') {
        info.content = folder.querySelector('LineString').querySelector('coordinates').textContent.replaceAll(',0', '')
      }

      return info
    }

    function isRoute(folder) {
      const placemarks = folder.querySelectorAll('Placemark')
      for (const placemark of placemarks) {
        if (placemark.querySelectorAll('LineString').length > 0) {
          return true
        }
      }

      return false
    }

    function renderRouteData(data) {
      const container = document.querySelector('#route-area')
      const template = document.querySelector('#route-template')
      const clone = template.content.cloneNode(true)

      if (data) {
        const name = clone.querySelector('p')
        const coordinates = clone.querySelector('textarea[name="route-coordinates"]')
        name.textContent = data.name
        coordinates.value = data.content
      }

      container.appendChild(clone)
    }

    function renderLocationData(data) {
      const container = document.querySelector('#location-area')
      const template = document.querySelector('#location-template')
      
      data.content.forEach(location => {
        const clone = template.content.cloneNode(true)
        const name = clone.querySelector('input[name="location-name"]')
        const coordinates = clone.querySelector('textarea[name="location-coordinates"]')
        name.value = location.name
        coordinates.value = location.coordinates

        container.appendChild(clone)
      })
    }

    function save() {
      const data = {
        activity_title: document.querySelector('#title').value,
        activity_description: document.querySelector('#description').value,
        activity_date: document.querySelector('#date').value,
        activity_link: document.querySelector('#link').value,
        routes: [],
        locations: []
      }

      // routes
      const routes = document.querySelectorAll('#route-area li')
      routes.forEach(route => {
        const routeData = {
          duration: Number(route.querySelector('input[name="duration"]').value),
          distance: Number(route.querySelector('input[name="distance"]').value),
          mode: Number(route.querySelector('select[name="mode"]').value),
          coordinates: route.querySelector('textarea[name="route-coordinates"]').value
        }
        data.routes.push(routeData)
      })

      // locations
      const locations = document.querySelectorAll('#location-area li')
      locations.forEach(location => {
        const locationData = {
          name: location.querySelector('input[name="location-name"]').value,
          tag: location.querySelector('input[name="location-tag"]').value,
          coordinates: location.querySelector('textarea[name="location-coordinates"]').value
        }
        data.locations.push(locationData)
      })

      postData(data)
    }

    async function postData(data) {
      const response = await fetch('/api/save_activity', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      
      alert(response.status === 200 ? 'Success' : 'Error:' + response.status)
    }
  </script>

  <template id="route-template">
    <li>
      <p></p>
  
      <label>Duration: <input type="number" name="duration"></label>
      (hours)
      <br/><br/>
  
      <label>Distance: <input type="number" name="distance"></label>
      (kilometers)
      <br/><br/>
  
      <label>Trip Mode: 
        <select name="mode" name="mode">
          <option value="0">Train</option>
          <option value="1">Walk</option>
          <option value="2">Bicycle</option>
          <option value="3">Car</option>
          <option value="4">Air</option>
          <option value="5">Ship</option>
          <option value="6">motorcycle</option>
        </select>
      </label>
      <br/><br/>
  
      <label>Coordinates: 
        <textarea name="route-coordinates" cols="30" rows="10"></textarea>
      </label>
      <br /><br />

      <button onclick="this.closest('li').remove()">Delete</button>
    </li>
  </template>

  <template id="location-template">
    <li>
      <p></p>
  
      <label>Name: <input type="text" name="location-name"></label>
      <br/><br/>
  
      <label>Tag: <input type="text" name="location-tag"></label>
      <br/><br/>
  
      <label>Coordinates: 
        <textarea name="location-coordinates" cols="30" rows="3"></textarea>
      </label>
      <br /><br />

      <button onclick="this.closest('li').remove()">Delete</button>
    </li>
  </template>
</body>
</html>

`

export default async () => new Response(html, {
  headers: { 'content-type': 'text/html;charset=UTF-8' },
})
