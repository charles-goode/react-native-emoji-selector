import React, { Component } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Image,
  ActivityIndicator,
  AsyncStorage,
  FlatList,
} from "react-native";
import emoji from "emoji-datasource";

export const Categories = {
  all: {
    symbol: null,
    name: "All",
  },
  history: {
    symbol: "🕘",
    name: "Recently used",
  },
  emotion: {
    symbol: "😀",
    name: "Smileys & Emotion",
  },
  people: {
    symbol: "🧑",
    name: "People & Body",
  },
  nature: {
    symbol: "🦄",
    name: "Animals & Nature",
  },
  food: {
    symbol: "🍔",
    name: "Food & Drink",
  },
  activities: {
    symbol: "⚾️",
    name: "Activities",
  },
  places: {
    symbol: "✈️",
    name: "Travel & Places",
  },
  objects: {
    symbol: "💡",
    name: "Objects",
  },
  symbols: {
    symbol: "🔣",
    name: "Symbols",
  },
  flags: {
    symbol: "🏳️‍🌈",
    name: "Flags",
  },
};

const charFromUtf16 = (utf16) =>
  String.fromCodePoint(...utf16.split("-").map((u) => "0x" + u));
export const charFromEmojiObject = (obj) => charFromUtf16(obj.unified);
const filteredEmojis = emoji.filter((e) => !e["obsoleted_by"]);
const emojiByCategory = (category) =>
  filteredEmojis.filter((e) => e.category === category);
const sortEmoji = (list) => list.sort((a, b) => a.sort_order - b.sort_order);
const categoryKeys = Object.keys(Categories);

const TabBar = ({ theme, activeCategory, onPress, width }) => {
  const tabSize = width / categoryKeys.length;

  return categoryKeys.map((c) => {
    const category = Categories[c];
    if (c !== "all")
      return (
        <TouchableOpacity
          key={category.name}
          onPress={() => onPress(category)}
          style={{
            flex: 1,
            height: tabSize,
            borderColor: category === activeCategory ? theme : "#EEEEEE",
            borderBottomWidth: 2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              textAlign: "center",
              paddingBottom: 8,
              fontSize: tabSize - 24,
            }}
          >
            {category.symbol}
          </Text>
        </TouchableOpacity>
      );
  });
};

const EmojiCell = React.memo(
  ({ emoji, colSize, onEmojiPress }) => (
    <TouchableOpacity
      activeOpacity={0.5}
      style={{
        width: colSize,
        height: colSize,
        alignItems: "center",
        justifyContent: "center",
      }}
      onPress={() => onEmojiPress(emoji)}
    >
      {emoji.source ? (
        <Image
          style={{ height: colSize - 8, width: colSize - 8 }}
          source={emoji.source}
        />
      ) : (
        <Text style={{ color: "#FFFFFF", fontSize: colSize - 12 }}>
          {charFromEmojiObject(emoji)}
        </Text>
      )}
    </TouchableOpacity>
  ),
  (prev, next) => prev.colSize === next.colSize
);

const storage_key = "@react-native-emoji-selector:HISTORY";
export default class EmojiSelector extends Component {
  state = {
    searchQuery: "",
    category: Categories.people,
    isReady: false,
    history: [],
    emojiList: null,
    colSize: 0,
    width: 0,
  };

  //
  //  HANDLER METHODS
  //
  handleTabSelect = (category) => {
    if (this.state.isReady) {
      if (this.scrollview)
        this.scrollview.scrollToOffset({ x: 0, y: 0, animated: false });
      this.setState({
        searchQuery: "",
        category,
      });
    }
  };

  handleEmojiSelect = (emoji) => {
    if (this.props.showHistory) {
      this.addToHistoryAsync(emoji);
    }
    this.props.onEmojiSelected(
      emoji.source ? emoji.name : charFromEmojiObject(emoji)
    );
  };

  handleSearch = (searchQuery) => {
    this.setState({ searchQuery });
  };

  addToHistoryAsync = async (emoji) => {
    let history = await AsyncStorage.getItem(storage_key);

    let value = [];
    if (!history) {
      // no history
      let record = Object.assign({}, emoji, { count: 1 });
      value.push(record);
    } else {
      let json = JSON.parse(history);
      if (json.filter((r) => r.unified === emoji.unified).length > 0) {
        value = json;
      } else {
        let record = Object.assign({}, emoji, { count: 1 });
        value = [record, ...json];
      }
    }

    AsyncStorage.setItem(storage_key, JSON.stringify(value));
    this.setState({
      history: value,
    });
  };

  loadHistoryAsync = async () => {
    let result = await AsyncStorage.getItem(storage_key);
    if (result) {
      let history = JSON.parse(result);
      this.setState({ history });
    }
  };

  //
  //  RENDER METHODS
  //
  renderEmojiCell = ({ item }) => (
    <EmojiCell
      key={item.key}
      emoji={item.emoji}
      onPress={this.handleEmojiSelect}
      colSize={this.state.colSize}
    />
  );

  returnSectionData() {
    const { history, emojiList, searchQuery, category, allEmojis } = this.state;
    const { customEmojis } = this.props;
    let emojiData = (function () {
      if (category === Categories.all && searchQuery === "") {
        //TODO: OPTIMIZE THIS
        let largeList = customEmojis;
        categoryKeys.forEach((c) => {
          const name = Categories[c].name;
          const list =
            name === Categories.history.name ? history : emojiList[name];
          if (c !== "all" && c !== "history")
            largeList = largeList.concat(list);
        });

        return largeList.map((emoji) => ({
          key: emoji.unified || emoji.name,
          emoji,
        }));
      } else {
        let list;
        const hasSearchQuery = searchQuery !== "";
        const name = category.name;
        if (hasSearchQuery) {
          const filtered = allEmojis.filter((e) => {
            let display = false;
            e.short_names.forEach((name) => {
              if (name.includes(searchQuery.toLowerCase())) display = true;
            });
            return display;
          });
          list = sortEmoji(filtered);
        } else if (name === Categories.history.name) {
          list = history;
        } else {
          list = emojiList[name];
        }
        return list.map((emoji) => ({
          key: emoji.unified || emoji.name,
          emoji,
        }));
      }
    })();
    return this.props.shouldInclude
      ? emojiData.filter((e) => this.props.shouldInclude(e.emoji))
      : emojiData;
  }

  prerenderEmojis(callback) {
    let emojiList = {};
    categoryKeys.forEach((c) => {
      let name = Categories[c].name;
      emojiList[name] = sortEmoji(emojiByCategory(name));
    });

    this.setState(
      {
        emojiList,
        colSize: Math.floor(this.state.width / this.props.columns),
      },
      callback
    );
  }

  handleLayout = ({ nativeEvent: { layout } }) => {
    this.setState({ width: layout.width }, () => {
      this.prerenderEmojis(() => {
        this.setState({ isReady: true });
      });
    });
  };

  //
  //  LIFECYCLE METHODS
  //
  componentDidMount() {
    const { category, showHistory, customEmojis } = this.props;
    this.setState({ category, allEmojis: customEmojis.concat(emoji) });

    if (showHistory) {
      this.loadHistoryAsync();
    }
  }

  render() {
    const {
      theme,
      columns,
      placeholder,
      showHistory,
      showSearchBar,
      showSectionTitles,
      showTabs,
      searchBarProps,
      searchBarStyle,
      searchBarContainerStyle,
      SearchBarComponent,
      flatlistProps,
      ...other
    } = this.props;

    const { category, colSize, isReady, searchQuery } = this.state;

    const Searchbar = SearchBarComponent ? (
      <SearchBarComponent
        value={searchQuery}
        onChangeText={this.handleSearch}
        autoCorrect={false}
        placeholder={placeholder}
      />
    ) : (
      <View style={[styles.searchbar_container, searchBarContainerStyle]}>
        <TextInput
          style={[styles.search, searchBarStyle]}
          placeholder={placeholder}
          clearButtonMode="always"
          returnKeyType="done"
          autoCorrect={false}
          underlineColorAndroid={theme}
          value={searchQuery}
          onChangeText={this.handleSearch}
          {...searchBarProps}
        />
      </View>
    );

    const title = searchQuery !== "" ? "Search Results" : category.name;

    return (
      <View style={styles.frame} {...other} onLayout={this.handleLayout}>
        <View style={styles.tabBar}>
          {showTabs && (
            <TabBar
              activeCategory={category}
              onPress={this.handleTabSelect}
              theme={theme}
              width={this.state.width}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          {showSearchBar && Searchbar}
          {isReady ? (
            <View style={{ flex: 1 }}>
              <View style={styles.container}>
                {showSectionTitles && (
                  <Text style={styles.sectionHeader}>{title}</Text>
                )}
                <FlatList
                  style={styles.scrollview}
                  contentContainerStyle={{ paddingBottom: colSize }}
                  data={this.returnSectionData()}
                  renderItem={this.renderEmojiCell}
                  horizontal={false}
                  numColumns={columns}
                  keyboardShouldPersistTaps={"always"}
                  getItemLayout={(data, index) => ({
                    length: colSize,
                    offset: colSize * index,
                    index,
                  })}
                  ref={(scrollview) => (this.scrollview = scrollview)}
                  removeClippedSubviews={true}
                  {...flatlistProps}
                />
              </View>
            </View>
          ) : (
            <View style={styles.loader} {...other}>
              <ActivityIndicator
                size={"large"}
                color={Platform.OS === "android" ? theme : "#000000"}
              />
            </View>
          )}
        </View>
      </View>
    );
  }
}

EmojiSelector.defaultProps = {
  theme: "#007AFF",
  category: Categories.all,
  showTabs: true,
  showSearchBar: true,
  showHistory: false,
  showSectionTitles: true,
  columns: 6,
  placeholder: "Search...",
  customEmojis: [],
};

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    width: "100%",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
  },
  scrollview: {
    flex: 1,
  },
  searchbar_container: {
    width: "100%",
    zIndex: 1,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  search: {
    ...Platform.select({
      ios: {
        height: 36,
        paddingLeft: 8,
        borderRadius: 10,
        backgroundColor: "#E5E8E9",
      },
    }),
    margin: 8,
  },
  container: {
    flex: 1,
    flexWrap: "wrap",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  sectionHeader: {
    margin: 8,
    fontSize: 17,
    width: "100%",
    color: "#8F8F8F",
  },
});
