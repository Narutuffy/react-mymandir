import React, { Component } from 'react';
import './App.css';
import temples from './templeNames.json';

const API_KEY = 'AIzaSyB2-Mdsde1s7Xnee32Y4z9x6JTFOR8Dspk';
const FETCH_TEMPLE_BY_SEARCH = `https://maps.googleapis.com/maps/api/place/textsearch/json?key=${API_KEY}`;
const FETCH_NEARBY_TEMPLES = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?type=hindu_temple&rankby=distance&key=${API_KEY}`;
const FETCH_TEMPLE_IMAGE = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=100&key=${API_KEY}`;
const FETCH_TEMPLE_BY_PLACEID = `https://maps.googleapis.com/maps/api/place/details/json?&key=${API_KEY}`; 

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      value:'',
      templeDetails:null,
      contentStatus: 'init',
    }
    
  }

  handleSubmit(event) {
    event.preventDefault();
  }

  findMatches(wordToMatch,temples) {
    return temples.filter(({name}) => {
      const regex = new RegExp(wordToMatch,'gi');
      return name.match(regex)
    });
  }

  handleChange(event) {
    console.log(event.target.value);
    this.setState({
      value: event.target.value
    },this.displayMatches);
    
  }

  displayMatches() {
    const inputText = this.state.value;
    const suggestionsList = document.querySelector('.suggestions');
    if(inputText===''){
      suggestionsList.innerHTML='';
    } else {   
      const matchArray = this.findMatches(inputText,temples);
      const suggestionsHtml = matchArray.map(({name}, index) => {
        const regex  = new RegExp(inputText,'gi');
        const styledName = name.replace(regex,`<span class="bold" data-name="${name}" >${inputText}</span>`);     
        return (
          `<li data-name="${name}">${styledName}</li>`
        );
      }).join('');
      suggestionsList.innerHTML=suggestionsHtml;
    }
  }

  setTempleAddressDetails({name, place_id, formatted_address}) {
    return this.setState({
     templeDetails: {
      ...this.state.templeDetails,
        name,
        placeId:place_id,
        address:formatted_address
      }
    });
  }

  getSetPhoto(photoId) {
    return fetch(`${FETCH_TEMPLE_IMAGE}&photoreference=${photoId}`)
    .then(({url}) => this.setState({templeDetails: {...this.state.templeDetails, thumbnail: url}}))
    .catch((e) => console.log("There are no Photos of this location")); 
  }

  getSetNearbyTemples(place_id, lat, lng) {
    return fetch(`${FETCH_NEARBY_TEMPLES}&placeid=${place_id}&location=${lat},${lng}`)
    .then(blob => blob.json())
    .then(res => {
      const nearbyTemples = res.results.slice(1,5)
        .map(({geometry, place_id, name}) => {
          return {
            name,
            lat: geometry.location.lat,
            lng: geometry.location.lng,
            place_id
          };
        });
      return nearbyTemples;
    })
    .then((nearbyTemples) => {
      this.setState({
        templeDetails: {
          ...this.state.templeDetails,
          nearbyTemples
        },
        contentStatus: "fetched"
      },()=>console.log(this.state));
    })
  }

  getTempleDetailsBySearch(event) {
    const templeName = event.target.dataset.name;
    this.setState({ value:'',contentStatus: "loading", templeDetails: null },this.displayMatches);
    fetch(`${FETCH_TEMPLE_BY_SEARCH}&query=${templeName}`)
      .then(blob => blob.json())
      .then(({results}) => {
        console.log(results[0], this.state);
        const { geometry, place_id, photos, formatted_address, name } = results[0];
        const {lat, lng} = geometry.location;
        let photoId = photos? photos[0].photo_reference : null; 
        this.setTempleAddressDetails({name, place_id, formatted_address});
        this.getSetPhoto(photoId);
        this.getSetNearbyTemples(place_id, lat, lng);
      })
      .catch((e) => {
        this.setState({ contentStatus: "error" },
        console.log("This Place could not be found",e,this.state));
      });
    
    
  }

  getTempleDetailsByPlaceId(place_id) {
    this.setState({contentStatus: "loading", templeDetails: null});
    fetch(`${FETCH_TEMPLE_BY_PLACEID}&placeid=${place_id}`)
      .then((blob) => blob.json())
      .then(({result}) => {
        const { geometry, place_id, photos, formatted_address, name } = result;
        const {lat, lng} = geometry.location;
        let photoId = photos? photos[0].photo_reference : null; 
        this.setTempleAddressDetails({name, place_id, formatted_address})
        this.getSetPhoto(photoId);
        this.getSetNearbyTemples(place_id, lat, lng);
      });
  }

  renderContent() {
    switch(this.state.contentStatus) {
      case "init":
        return null;
      case "loading":
        return (
          <div className="temple_card" >
            <div className="loader" />
          </div>
        );
      case "fetched":
        return this.renderTempleDetailsCard();
      case "error":
        return <div className="temple_card">Sorry we've come across a problem. Please try another temple</div>
    }
  }

  renderTempleDetailsCard() {
    const { address, thumbnail, name, nearbyTemples, placeId } = this.state.templeDetails;
    return(
      <div className= "temple_card">
        <div style={{marginRight: 'auto'}}>
          <div className= "top_section">
            <img src={thumbnail} />
              <div>
                <h3>{name}</h3>
                <a href={`https://www.google.com/maps/place/?q=place_id:${placeId}`} target="_blank" className="font_size_m" >{address}</a>
              </div>
          </div>
          <div>
            <div className="font_size_m">NEARBY TEMPELS</div>
            {nearbyTemples.map(({name, place_id}) =>{
              return (
                <a href="#" key={place_id} className="font_size_m" onClick={() =>{this.getTempleDetailsByPlaceId(place_id)}}>
                  {name}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="App">
        <nav className="navbar navbar-light" style={{ backgroundColor: '#ff8000' }} >
          <span className="navbar-brand" style={{color: '#fff'}}>mymandir</span>
        </nav>
        <div className="container">
          <div className="row" >
            <form onSubmit={event => this.handleSubmit(event)} >
              <div className="form-group">
                <input type="text" onChange={event => this.handleChange(event)} className="form-control"  placeholder="Search" value={this.state.value}/>
                <ul className="suggestions" onClick={event => this.getTempleDetailsBySearch(event)} >
                </ul>
              </div>              
            </form>
              {this.renderContent()}
          </div>
        </div>
      </div>
    );
  }
}

export default App;
