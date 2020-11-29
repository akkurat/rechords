import * as React from 'react';
import { Component } from 'react';
import { Revision } from '../api/collections';

import * as moment from 'moment';
import "moment/locale/de";
import { Change, Diff, diffChars } from 'diff';
import { convertDiff } from './RevBrowserAdvanced';
import { blame } from 'blame-ts/';
import { IBlameLine } from '../../../blame-ts/dist/blame';

interface SourceAdvancedProps {
  md: string;
  updateHandler: Function;
  readOnly: boolean;
  className: string;
  // todo:origin is anobjectwith revision tag, user and caption
  revs?: Revision[]
}

export class SourceAdvanced extends Component<SourceAdvancedProps> {
  textAreaRef: React.RefObject<HTMLTextAreaElement>;

  constructor(props) {
    super(props);
    this.textAreaRef = React.createRef()
  }

  callUpdateHandler = () => {
    if ('updateHandler' in this.props) {
      this.props.updateHandler(this.textAreaRef?.current.value);
    }
  }

  render() {
    // Height estimation
    let rowsMatch = this.props.md.match(/\n/g)

    let rows: number;
    if (rowsMatch != null) {
      rows = rowsMatch.length * 1.4 + 10;
    }

    rows = Math.max(50, rows);

    let style = {
      minHeight: rows + 'em',
    }



    const lt = new LineTracker()

    const content = this.textAreaRef.current?.value || this.props.md

    const contentLines = content?.split('\n');

    let blamelines: Diffline<Revision>[] = []
    const revs = this.props.revs.slice()
    const pb = getBlameLines(revs);
    if (contentLines && pb) {
      blamelines = pb.map((l, idx) => {
        if (contentLines[idx] == l.value) {
          return {
            className: "annoline", dataRevid: l.origin._id, info: l,
            display: lt.getLineDisplay(l.origin)
          }
        } else {
          return { davaRevid: "*", display: "*" }
        }
      });
    }

    const blamelines_grouped = grouping( blamelines, 'dataRevid', id => this.getDiff(id) )





    return (
      <div className={"content source-adv " + this.props.className}>
        {this.props.children}
        <div style={style} className="blameColumn">{blamelines_grouped}</div>
        <textarea
          ref={this.textAreaRef}
          onChange={this.callUpdateHandler}
          value={this.props.md}
          style={style}
          readOnly={this.props.readOnly}
        />
      </div>
    )
  }
  private getDiff(last_id: string) {
    const revs = this.props.revs
    if (revs && revs.length) {
      const idx = revs.findIndex(v => v._id === last_id)
      const oldText = idx < revs.length - 1 ? revs[idx + 1].text : ''
      const diff = diffChars(oldText, revs[idx].text)
      return diff
    }
  }
}


class LineTracker {
  sameCount = 0
  lastId: string
  getLineDisplay(origin: Revision): string {
    if (!origin) {
      return ""
    }
    if (this.lastId != origin._id) {
      this.sameCount = 0;
    }

    let r;

    switch (this.sameCount) {
      case 0: r = Meteor.users.findOne(origin.editor)?.profile.name || origin.editor || '???'; break;
      case 1: r = moment(origin.timestamp).format('lll'); break;
      case 2: r = origin.ip; break;
      default: r = "___"
    }

    this.lastId = origin._id
    this.sameCount += 1

    return r

  }



}

function grouping(elements: Diffline[], attribute: string, cb: (id: string) => any ): React.ReactElement[] {
  let returnvalue = []
  let last_id: string = null
  let currentParent: React.ReactElement = null
  // Maybe it was better to create a map first
  // not push directly into the children of the reactelements
  for (const el of elements) {
    if (el[attribute] != last_id) {
      last_id = el[attribute]
      currentParent = <DiffGroup info={el.info} cb={cb}>{[]}</DiffGroup>
      returnvalue.push(currentParent)
    }
    console.log(currentParent.props.children.length)
    currentParent.props.children.push(<div className={el.className}>{el.display}</div>)
  }
  // console.log(returnvalue.reduce( (a,c) => a + c.props.children.reduce( (e, f) => e + 1, 0 ), 0 ) )



  return returnvalue;
}

function getBlameLines(versions: Revision[]): IBlameLine<Revision>[] {
  return blame(versions, { getCode: (a: Revision) => a.text, getOrigin: (b: Revision) => b })
}

type Diffline<S> = {
  dataRevid: string;
  className?: string;
  info: IBlameLine<S>;
  display: string;
};

const DiffGroup: React.FunctionComponent<{info: IBlameLine<Revision>,cb: (id:string) => any }> = 
({info, cb, children}) => {
  const [visible, setVisible] = React.useState<boolean>(false)
  const id = info?.origin._id
  const diff = id ? cb(id) : []
  return <div className='annotation' key={id} onClick={e => setVisible(p => !p)}>
    <div style={{ position: "relative" }}>
      <div className={'hover ' + (visible ? '' : 'hidden')}>
        Line: {info?.lineindiff}
        {diff.map(d => convertDiff(d))}
      </div>
    </div>
    {children}
  </div>
}


