import React, { Component } from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';

const DefaultChat = React.lazy(() => import('./pages/DefaultChat'));

const loading = (
  <div className="pt-3 text-center">
    <div className="sk-spinner sk-spinner-pulse"></div>
  </div>
)

class App extends Component {
  render() {
    return (
      <HashRouter>
        <React.Suspense fallback={loading}>
          <Switch>
            <Route exact path="/chat" name="DefaultChat" render={props => <DefaultChat {...props} />} />
            {/* <Route path="/" name="Home" render={props => <TheLayout {...props} />} /> */}
          </Switch>
        </React.Suspense>
      </HashRouter>
    );
  }
}

export default App;