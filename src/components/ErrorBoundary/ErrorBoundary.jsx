import { Component } from 'react';
import './ErrorBoundary.css';

/**
 * Catch a crash and say so, instead of rendering nothing.
 *
 * WHY THIS EXISTS
 * On 2026-09-06 a TypeError thrown inside one effect in AppContext took the
 * whole tree down, and every visitor to the production site got a blank page.
 * Nothing reported it: not the build, which compiles rather than renders, and
 * not the tests, none of which mounted the application. It was found by a user
 * asking why the site was empty.
 *
 * A blank page is the worst possible failure mode, because it looks identical
 * to a broken deploy, a network problem, a dead domain and an empty database.
 * This turns all of those into a sentence.
 *
 * Deliberately a class component: `getDerivedStateFromError` and
 * `componentDidCatch` have no hook equivalent. This is the one place in the
 * codebase where a class is the only option.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the stack in the console for whoever is looking, and leave a hook
    // here for real error reporting when there is somewhere to send it.
    console.error('Unhandled error:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="errb">
        <div className="errb__panel">
          <p className="errb__eyebrow">Something broke</p>
          <h1 className="errb__title">This page didn&rsquo;t load</h1>
          <p className="errb__body">
            The problem is on our side, not yours. Reloading usually helps. If it
            keeps happening, tell us what you were doing and we&rsquo;ll fix it.
          </p>

          <div className="errb__actions">
            <button className="errb__btn" onClick={() => window.location.reload()}>
              Reload
            </button>
            <a className="errb__link" href="/">Go to the home page</a>
          </div>

          {/* The message, always. Not everyone will open a console, and "it just
              says something broke" is a far less useful bug report than the
              actual error text. */}
          <details className="errb__details">
            <summary className="errb__summary">Technical detail</summary>
            <pre className="errb__pre">{String(error?.message || error)}</pre>
          </details>
        </div>
      </div>
    );
  }
}
