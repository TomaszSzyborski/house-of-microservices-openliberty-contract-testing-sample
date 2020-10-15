import React, { Component } from 'react';
import axios from 'axios';
import ReactTable from 'react-table-6';
import 'react-table-6/react-table.css';
import BodyPart from './BodyPart';
import House from './House';

class ResidentTable extends Component {
  state = {
    posts: [],
    isLoading: true,
    error: null,
  };

  wakeupResident() {
    this.axiosCancelSource = axios.CancelToken.source();
    this.setState({
      room: null,
      posts: [],
      isLoading: true,
    });
    // We rely on axios.defaults.baseURL for the base url
    axios.put('/resident/wakeup');
  }

  getResidentInfo() {
    this.counter++;
    this.axiosCancelSource = axios.CancelToken.source();

    // We rely on axios.defaults.baseURL for the base url
    axios('/resident/state', {
      headers: { Accept: 'application/json' },
    })
      .then((response) => {
        const resident = response.data;
        const room = resident.room;

        // Hackily, filter out the room so it doesn't mess up the body display
        delete resident.room;

        const posts = Object.entries(resident)
          .map((b) => {
            return {
              name: b[0],
              state: b[1].state,
              innards: JSON.stringify(b[1]),
            };
          })
          .flat();
        // Poll our data; SSE or websockets would be cleaner, but also more complicated!
        // To avoid being super-hungry, only poll for 10s after load
        if (this.counter < 10) {
          this.timer = setTimeout(() => this.getResidentInfo(), 1000);
        }

        this.setState({
          room,
          posts,
          isLoading: false,
        });
      })
      .catch((error) => {
        // Don't complain if the request has been cancelled
        if (this.axiosCancelSource) {
          console.warn(error);
        }
      });
  }

  componentDidMount() {
    this.counter = 0;
    this.wakeupResident();
    this.getResidentInfo();
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
    this.timer = null;
    if (this.axiosCancelSource) {
      this.axiosCancelSource.cancel();
      this.axiosCancelSource = null;
    }
  }

  render() {
    const { isLoading, posts, room } = this.state;
    const columns = [
      {
        Header: 'Body Part Info',
        columns: [
          {
            Header: 'Body Part Name',
            accessor: 'name',
          },
        ],
      },
      {
        Header: 'State',
        columns: [
          {
            Header: 'State',
            accessor: 'state',
          },
          {
            Header: 'Innards',
            accessor: 'innards',
          },
        ],
      },
    ];

    return (
      <div className="page">
        <div className="graphics">
          <House room={room} />

          <div className="resident">
            {!isLoading ? (
              <div className="body">
                {posts.map((part) => (
                  <BodyPart
                    key={part.name}
                    name={part.name}
                    state={part.state}
                  />
                ))}
              </div>
            ) : (
              <div />
            )}
          </div>
          {!isLoading ? (
            <ReactTable
              data={posts}
              columns={columns}
              defaultPageSize={6}
              pageSizeOptions={[4, 6, 8, 12]}
            />
          ) : (
            <p>Loading .....</p>
          )}
        </div>
      </div>
    );
  }
}

export default ResidentTable;
