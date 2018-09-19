import * as React from 'react';
import { NavLink } from 'react-router-dom';
import MetaContent from './MetaContent';
import {Song} from '../api/collections';


interface ListItemProps {
    song: Song;
}
class ListItem extends React.Component<ListItemProps, {}> {
    constructor(props) {
        super(props);
    }


    render() {
        return (
            <li><NavLink to={`/view/${this.props.song.author_}/${this.props.song.title_}`}
                activeClassName="selected">{this.props.song.title}</NavLink></li>
        );
    }
}



interface ListGroupProps {
  songs: Array<Song>;
  label: String;
}
class ListGroup extends React.Component<ListGroupProps, {}> {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <li key={this.props.label}>
                <h2>{this.props.label}</h2>
                <ul>
                    {this.props.songs.map((song) => 
                        <ListItem song={song} key={song._id} />
                    )}
                </ul>
            </li>
        )
    }
}


interface ListProps {
  songs: Array<Song>;
}
interface ListState {
    filter: string;
    active: boolean;
}
export default class List extends React.Component<ListProps, ListState> {
    constructor(props) {
        super(props);
        this.state = {
            filter: '',
            active: false
        }
    }

    onChange = (event : React.ChangeEvent<HTMLInputElement>) => {
        this.setState({
          filter: event.currentTarget.value
        });
        event.preventDefault();
      };

    onFocus = () => {
        this.setState({
            active: true
        });
    }

    onBlur = () => {
        this.setState({
            active: false
        });
    }

    onTagClick = (event : React.MouseEvent) => {
        this.setState({
            filter: this.state.filter + '#' + event.currentTarget.childNodes[0].textContent.toLowerCase() + ' '
        });
        event.preventDefault();
    }


    render() {
        let tree = {};

        let filters = this.state.filter.split(' ');

        this.props.songs.forEach((song) => {
            for (let filter of filters) {
                filter = filter.toLowerCase();

                if (!song.title.toLowerCase().includes(filter) &&
                    !song.text.toLowerCase().includes(filter) &&
                    !song.author_.toLowerCase().includes(filter)) {
                    return;
                }
            }

            // Hack to hide all songs containing an 'archiv'-tag
            if (song.getTags().includes('archiv') && this.state.filter != '#archiv') {
                return;
            }

            // Hide meta songs.
            if (song.author == 'Meta') return;

            if (tree[song.author] === undefined) {
                tree[song.author] = [];
            }
            tree[song.author].push(song);
        });

        let groups = [];
        for (let key in tree) {
            groups.push(key);
        }

        let active = this.state.active ? '' : 'hidden';
        let filled = this.state.filter == '' ? '' : 'filled';

        const process = (node) => {
            if (node.name == 'li') {
                let b = node.children.length > 1 ? <b>…</b> : null;
                return <li onMouseDown={this.onTagClick.bind(this)}>{node.children[0].data}{b}</li>
            }

            return node;
        }

        return (
            <aside id="list">
                <div className="filter">
                    <input type="text" 
                        placeholder="Filtern…" 
                        value={this.state.filter} 
                        onChange={this.onChange}
                        onFocus={this.onFocus}
                        onBlur={this.onBlur}
                        />
                    <span className={'reset ' + filled} onClick={(e)=>{this.setState({filter: ''})}}>&times;</span>
                </div>

                <MetaContent 
                    replace={process}
                    className={'filterMenu ' + active} 
                    title="Schlagwortverzeichnis" 
                    songs={this.props.songs}
                    />
                <ul>
                    {groups.map((group) => 
                        <ListGroup label={group} songs={tree[group]} key={group}/>
                    )}
                    <li>
                        <h2><NavLink to="/new">+ Neues Lied</NavLink></h2>
                    </li>
                </ul>
            </aside>
        )
    }
}