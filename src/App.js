import { gql, useQuery, useMutation } from "@apollo/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimesCircle,
  faBullhorn,
  faSpinner,
  faBomb,
  faHeart,
  faSign,
} from "@fortawesome/free-solid-svg-icons";
import { isEqual, isEmpty, noop } from "lodash";
import moment from "moment";
import { useEffect, useState } from "react";
import { useWindowSize } from 'react-use';
import Modal from "react-modal";

Modal.defaultStyles.overlay.backgroundColor = "rgba(0, 0, 0, 0.2)";

const handleKey = "handle";
const handle = () => window.sessionStorage.getItem(handleKey);

const GET_SIGNS = gql`
  query GetSigns {
    signs(order_by: { created_at: desc }) {
      id
      coordinates
      characters
      handle
      created_at
      likes {
        id
      }
      comments {
        created_at
        id
        comment
      }
    }
  }
`;

function getCharacters(coordinates, characters) {
  const keys = coordinates.split(";");
  const values = characters.split(";");
  const entries = keys.map((key, index) => [key, values[index]]);
  return Object.fromEntries(entries);
}

const numberOfRows = 4;
const numberOfColumns = 17;

function getIndex(rowIndex, columnIndex) {
  return `${rowIndex}, ${columnIndex}`;
}
const ADD_SIGN = gql`
  mutation AddSign(
    $characters: String!
    $coordinates: String!
    $handle: String!
  ) {
    insert_signs_one(
      object: {
        characters: $characters
        coordinates: $coordinates
        handle: $handle
      }
    ) {
      id
      coordinates
      characters
      handle
      created_at
      likes {
        id
      }
      comments {
        created_at
        id
        comment
      }
    }
  }
`;

function Sign({
  characters: defaultCharacters = {},
  displayOnly = true,
  onSubmit = noop,
  onUpdate = noop,
}) {
  const [characters, setCharacters] = useState({});

  const [addSign, { data }] = useMutation(ADD_SIGN, {
    refetchQueries: [GET_SIGNS, "GetSigns"],
  });

  useEffect(() => {
    if (displayOnly && !isEqual(defaultCharacters, characters)) {
      setCharacters(defaultCharacters);
    }
  }, [characters, defaultCharacters, displayOnly]);

  useEffect(() => {
    if (!isEmpty(data)) {
      onUpdate(data);
    }
  }, [data, onUpdate]);

  function handleClear() {
    setCharacters({});
  }

  function handleType(event, index) {
    setCharacters({
      ...characters,
      [index]: event.target.value,
    });
  }

  function handleSubmit() {
    const variables = {
      characters: Object.values(characters).join(";"),
      coordinates: Object.keys(characters).join(";"),
      handle: handle(),
    };
    addSign({ variables });
    onSubmit();
  }

  return (
    <>
      <div className="sign">
        {new Array(numberOfRows).fill("x").map((_, rowIndex) => (
          <div key={rowIndex} className="row">
            {new Array(numberOfColumns).fill("x").map((_, columnIndex) => (
              <div key={columnIndex} className="column">
                <input
                  maxLength={1}
                  onChange={(event) => {
                    handleType(event, getIndex(rowIndex, columnIndex));
                  }}
                  type="text"
                  value={
                    !isEmpty(characters)
                      ? characters[getIndex(rowIndex, columnIndex)]
                      : ""
                  }
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      {!displayOnly && (
        <div className="flex mt-4 justify-end">
          <button
            className="mr-2 bg-blue-500 hover:bg-blue-600 text-white text-lg px-4 py-2 rounded-lg"
            onClick={handleSubmit}
          >
            <FontAwesomeIcon className="mr-2 text-white" icon={faBullhorn} />
            Announce
          </button>
          <button className="text-white" onClick={handleClear}>
            Clear
          </button>
        </div>
      )}
    </>
  );
}

const styles = {
  h1: "text-4xl font-bold text-white",
  callout: "text-xl mt-8 mb-8 px-5 md:px-0",
  note: "bg-gray-800 p-2 px-3 rounded-xl flex justify-center md:justify-between items-center",
  button: "px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md",
  disabledButton: "px-4 py-2 bg-gray-800 cursor-not-allowed text-black rounded-md",
  h1Mobile: "text-2xl font-bold text-white",
};

const INCREMENT_LIKES = gql`
  mutation IncrementLikes($id: Int!) {
    insert_likes_one(object: { sign_id: $id }) {
      id
    }
  }
`;

function App() {
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [likes, setLikes] = useState({});
  const [newAnnouncements, setNewAnnouncements] = useState([]);
  const [typedHandle, setTypedHandle] = useState("");
  const [hasEnteredHandle, setHasEnteredHandle] = useState(handle);

  const { loading, error, data } = useQuery(GET_SIGNS);

  const [incrementLikes] = useMutation(INCREMENT_LIKES);

  async function handleType(event) {
    const result = event.target.value.replace("@", "").trim();
    setTypedHandle(result);
  }

  const { width } = useWindowSize();
  if (width <= 640) {
    return (
      <div className="px-12 flex flex-row items-center justify-center overflow-x-hidden text-white bg-gray-900 min-h-screen w-screen">
        <div className={styles.h1Mobile}>Sorry. You'll have to check this out on desktop.</div>
      </div>
    )
  }

  if (!hasEnteredHandle) {
    return (
      <div className="flex flex-row justify-center overflow-x-hidden text-white bg-gray-900 min-h-screen w-screen">
        <Modal
          className="h-full w-full flex flex-col items-center justify-center"
          isOpen={true}
        >
          <div className={styles.h1}>Please enter your handle</div>
          <input
            className="mt-8 rounded-md px-4 py-2 bg-gray-800 text-white"
            onChange={handleType}
            type="text"
            value={typedHandle}
          />
          <button
            className={`mt-4 ${!typedHandle ? styles.disabledButton :styles.button}`}
            disabled={!typedHandle}
            onClick={() => {
              window.sessionStorage.setItem(handleKey, typedHandle);
              setHasEnteredHandle(true);
            }}
          >
            <FontAwesomeIcon
              className="mr-2"
              icon={faSign}
              style={{ transform: "scaleX(-1)" }}
            />
            Post Your Sign
          </button>
        </Modal>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-row justify-center overflow-x-hidden text-white bg-gray-900 min-h-screen w-screen ${
        isAnnounceModalOpen ? "filter blur-lg" : ""
      }`}
    >
      <Modal
        className="h-full w-full flex flex-col items-center justify-center"
        isOpen={isAnnounceModalOpen}
      >
        <div className="h-64 rounded-lg bg-gray-800 shadow-lg w-1/2">
          <FontAwesomeIcon
            className="cursor-pointer absolute text-white -ml-2 -mt-2"
            icon={faTimesCircle}
            onClick={() => {
              setIsAnnounceModalOpen(false);
            }}
          />
          <Sign
            displayOnly={false}
            onSubmit={() => {
              setIsAnnounceModalOpen(false);
            }}
            onUpdate={(newAnnouncement) => {
              setNewAnnouncements([...newAnnouncements, newAnnouncement]);
            }}
          />
        </div>
      </Modal>
      <main className="p-3 py-16 flex flex-row justify-between w-full max-w-screen-lg">
        <div className="flex flex-col w-1/3 pr-12">
          <div className={styles.h1}>
            <FontAwesomeIcon
              className="mr-2"
              icon={faSign}
              style={{ transform: "scaleX(-1)" }}
            />
            Sign Wars
          </div>
          <div className={styles.callout}>
            Have something to announce? Make a sign.
          </div>
          <button
            className={styles.button}
            onClick={() => {
              setIsAnnounceModalOpen(true);
            }}
          >
            <FontAwesomeIcon className="mr-2 text-white" icon={faBullhorn} />
            Announce
          </button>
          <a className="mt-8" target="_blank" rel="noopener noreferrer" href="https://www.producthunt.com/posts/sign-wars?utm_source=badge-review&utm_medium=badge&utm_souce=badge-sign-wars#discussion-body" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/review.svg?post_id=307975&theme=dark" alt="Sign Wars - Like Twitter and Shopping Mall Signs Had a Baby | Product Hunt" style={{ width: 250, height: 54 }} /></a>
        </div>
        <div className="flex flex-col w-2/3">
          <div className={styles.note}>
            Here's what people have to announce.
          </div>
          <div className="mt-8 flex flex-col items-center">
            {loading && (
              <FontAwesomeIcon className="animate-spin" icon={faSpinner} />
            )}
            {error && (
              <div className="text-white">
                <FontAwesomeIcon className="mr-2" icon={faBomb} />
                Oops! Something went wrong. Try again later.
              </div>
            )}
            {data &&
              data.signs.map((sign) => (
                <div
                  key={sign.id}
                  className="cursor-pointer flex flex-col mb-8"
                >
                  <div className="flex flex-col bg-gray-800 w-full rounded-md">
                    <Sign
                      characters={getCharacters(
                        sign.coordinates,
                        sign.characters
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center justify-center">
                      <div className="text-blue-500">
                        {sign.handle}
                      </div>
                      <div className="ml-4 text-gray-400">
                        {moment(sign.created_at).fromNow()}
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="mr-4">
                        <FontAwesomeIcon
                          className={`mr-1 ${
                            likes[sign.id] ? "text-red-500" : ""
                          } hover:text-red-500`}
                          icon={faHeart}
                          onClick={() => {
                            setLikes({
                              ...likes,
                              [sign.id]: true,
                            });
                            incrementLikes({
                              variables: { id: sign.id },
                            });
                          }}
                        />
                        {likes[sign.id] ? sign.likes.length + 1 : sign.likes.length}
                      </div>
                      {/* <div>
                        <FontAwesomeIcon
                          className="mr-1 hover:text-blue-400"
                          icon={faComments}
                        />
                        {sign.comments.length}
                      </div> */}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
