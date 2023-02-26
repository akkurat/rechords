import React, { Component } from 'react';


interface SourceProps extends React.PropsWithChildren {
  md: string;
  updateHandler?: (md: string) => void;
  readOnly?: boolean;
  className: string;
}

export default class Source extends Component<SourceProps, never> {
  private readonly source: React.RefObject<HTMLTextAreaElement>;

  constructor(props) {
    super(props);
    this.source = React.createRef();
  }

  callUpdateHandler = () => {
    if ('updateHandler' in this.props) {
      this.props.updateHandler(this.source.current.value);
    }
  };

  render() {
    // Height estimation
    const row_matches = this.props.md.match(/\n/g);
    let rows = 0;

    if (row_matches != null) {
      rows = row_matches.length * 1.8 + 10;
    }

    rows = Math.max(50, rows);

    const style = {
      minHeight: rows + 'em',
    };

    return (
      <div className={'content ' + this.props.className}>
        {this.props.children}
        <textarea
          ref={this.source}
          onChange={this.callUpdateHandler}
          value={this.props.md}
          style={style}
          readOnly={this.props.readOnly}
        />
      </div>
    );
  }
}

